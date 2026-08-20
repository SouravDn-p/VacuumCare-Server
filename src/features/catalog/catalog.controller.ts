import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Prisma } from '../../../generated/prisma/client';
import { UserRole } from '../../../generated/prisma/enums';
import type { AuthUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../common/dto/api-response.dto';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../service/cloudinary/cloudinary.service';
import { CategoryDto, ProductQueryDto, ProductSort } from './dto/catalog.dto';
import {
  ProductCategoryCountDto,
  ProductDetailResponseDto,
  ProductPageResponseDto,
  ProductResponseDto,
  ServiceCategoryResponseDto,
} from './dto/catalog-response.dto';

@ApiTags('Catalog')
@ApiBearerAuth()
@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get('services')
  @ApiOperation({ summary: 'List available service categories and issues' })
  @ApiOkResponse({ type: ServiceCategoryResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  services() {
    return this.prisma.serviceCategory.findMany({ include: { issues: true } });
  }

  @Get('product-categories')
  @ApiOperation({
    summary: 'List active product categories for the store filter sidebar',
  })
  @ApiOkResponse({ type: ProductCategoryCountDto, isArray: true })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async productCategories() {
    const groups = await this.prisma.product.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { _all: true },
      orderBy: { category: 'asc' },
    });
    return groups.map((group) => ({
      name: group.category,
      count: group._count._all,
    }));
  }

  @Get('products')
  @ApiOperation({
    summary: 'Search and browse active shop products',
    description:
      'Supports store filters: search (name/SKU), categories, price range, in-stock only, sort, and pagination.',
  })
  @ApiOkResponse({ type: ProductPageResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async products(@Query() query: ProductQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 24, 100);
    const categories = [
      ...(query.categories ?? []),
      ...(query.category ? [query.category] : []),
    ];
    const where = {
      isActive: true,
      ...(categories.length
        ? {
            OR: categories.map((category) => ({
              category: { equals: category, mode: 'insensitive' as const },
            })),
          }
        : {}),
      ...(query.inStockOnly ? { stock: { gt: 0 } } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            AND: [
              {
                OR: [
                  {
                    name: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    sku: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    description: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    category: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: this.productOrderBy(query.sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: items.map((product) => this.mapProduct(product)),
      total,
      page,
      pageSize,
    };
  }

  @Get('products/:idOrSlug')
  @ApiOperation({
    summary: 'Get one active product by ID or slug, plus related products',
  })
  @ApiParam({ name: 'idOrSlug', description: 'Product ID or SEO slug' })
  @ApiOkResponse({ type: ProductDetailResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async product(@Param('idOrSlug') idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: { isActive: true, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!product) throw new NotFoundException('Product not found');
    const related = await this.prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        category: { equals: product.category, mode: 'insensitive' },
      },
      orderBy: this.productOrderBy(ProductSort.POPULARITY),
      take: 4,
    });
    return {
      ...this.mapProduct(product),
      relatedProducts: related.map((item) => this.mapProduct(item)),
    };
  }

  @Post('services')
  @ApiOperation({ summary: 'Create a service category (admin only)' })
  @ApiCreatedResponse({ type: ServiceCategoryResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'Only administrators can create service categories.',
  })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  createService(@CurrentUser() user: AuthUser, @Body() dto: CategoryDto) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException();
    return this.prisma.serviceCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        issues: dto.issues?.length
          ? { create: dto.issues.map((name) => ({ name })) }
          : undefined,
      },
      include: { issues: true },
    });
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a shop product (admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'description', 'category', 'price', 'stock'],
      properties: {
        sku: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'integer' },
        slug: { type: 'string' },
        features: { type: 'array', items: { type: 'string' } },
        specifications: { type: 'string', description: 'JSON string' },
        warranty: { type: 'string' },
        shippingInfo: { type: 'string' },
        isActive: { type: 'boolean' },
        taxable: { type: 'boolean', default: true },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'Only administrators can create products.',
  })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @UseInterceptors(FilesInterceptor('images', 10))
  async createProduct(
    @CurrentUser() user: AuthUser,
    @Body() dto: Record<string, string | string[] | undefined>,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException();
    return this.prisma.product.create({
      data: {
        sku: this.optionalString(dto.sku),
        name: this.requiredString(dto.name, 'name'),
        description: this.requiredString(dto.description, 'description'),
        category: this.requiredString(dto.category, 'category'),
        price: this.requiredNumber(dto.price, 'price'),
        stock: this.requiredInteger(dto.stock, 'stock'),
        slug: this.optionalString(dto.slug),
        features: this.optionalStringArray(dto.features),
        specifications: this.optionalJson(dto.specifications),
        warranty: this.optionalString(dto.warranty),
        shippingInfo: this.optionalString(dto.shippingInfo),
        isActive: this.optionalBoolean(dto.isActive) ?? true,
        taxable: this.optionalBoolean(dto.taxable) ?? true,
        imageUrls: await this.uploadProductMedia(files),
      },
    });
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update a shop product (admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'integer' },
        slug: { type: 'string' },
        features: { type: 'array', items: { type: 'string' } },
        specifications: { type: 'string', description: 'JSON string' },
        warranty: { type: 'string' },
        shippingInfo: { type: 'string' },
        isActive: { type: 'boolean' },
        taxable: { type: 'boolean' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: 'Only administrators can update products.',
  })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @UseInterceptors(FilesInterceptor('images', 10))
  async updateProduct(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: Record<string, string | string[] | undefined>,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException();
    const imageUrls = files.length
      ? await this.uploadProductMedia(files)
      : undefined;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.sku !== undefined ? { sku: this.optionalString(dto.sku) } : {}),
        ...(dto.name ? { name: this.requiredString(dto.name, 'name') } : {}),
        ...(dto.description
          ? { description: this.requiredString(dto.description, 'description') }
          : {}),
        ...(dto.category
          ? { category: this.requiredString(dto.category, 'category') }
          : {}),
        ...(dto.price !== undefined
          ? { price: this.requiredNumber(dto.price, 'price') }
          : {}),
        ...(dto.stock !== undefined
          ? { stock: this.requiredInteger(dto.stock, 'stock') }
          : {}),
        ...(dto.slug ? { slug: this.optionalString(dto.slug) } : {}),
        ...(dto.features
          ? { features: this.optionalStringArray(dto.features) }
          : {}),
        ...(dto.specifications
          ? { specifications: this.optionalJson(dto.specifications) }
          : {}),
        ...(dto.warranty
          ? { warranty: this.optionalString(dto.warranty) }
          : {}),
        ...(dto.shippingInfo
          ? { shippingInfo: this.optionalString(dto.shippingInfo) }
          : {}),
        ...(dto.isActive !== undefined
          ? { isActive: this.optionalBoolean(dto.isActive) }
          : {}),
        ...(dto.taxable !== undefined
          ? { taxable: this.optionalBoolean(dto.taxable) }
          : {}),
        ...(imageUrls ? { imageUrls } : {}),
      },
    });
  }

  private mapProduct(product: {
    features: string[];
    stock: number;
    [key: string]: unknown;
  }) {
    return {
      ...product,
      tagline: product.features[0] ?? null,
      inStock: product.stock > 0,
    };
  }

  private productOrderBy(
    sort?: ProductSort,
  ): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        return [{ price: 'asc' }, { name: 'asc' }];
      case ProductSort.PRICE_DESC:
        return [{ price: 'desc' }, { name: 'asc' }];
      case ProductSort.NEWEST:
        return [{ id: 'desc' }];
      case ProductSort.NAME:
        return [{ name: 'asc' }];
      case ProductSort.POPULARITY:
      default:
        return [{ orderItems: { _count: 'desc' } }, { name: 'asc' }];
    }
  }

  private async uploadProductMedia(files: Express.Multer.File[]) {
    if (!files.length) return undefined;
    const urls = await Promise.all(
      files.map((file) =>
        this.cloudinary.uploadFile(file, 'vacumeCare/products'),
      ),
    );
    return urls;
  }

  private requiredString(value: string | string[] | undefined, field: string) {
    const first = this.firstValue(value);
    if (!first) throw new ForbiddenException(`${field} is required`);
    return first;
  }

  private requiredNumber(value: string | string[] | undefined, field: string) {
    const parsed = Number(this.requiredString(value, field));
    if (Number.isNaN(parsed))
      throw new ForbiddenException(`${field} must be a number`);
    return parsed;
  }

  private requiredInteger(value: string | string[] | undefined, field: string) {
    const parsed = Number(this.requiredString(value, field));
    if (!Number.isInteger(parsed))
      throw new ForbiddenException(`${field} must be an integer`);
    return parsed;
  }

  private optionalString(value: string | string[] | undefined) {
    return this.firstValue(value) ?? undefined;
  }

  private optionalBoolean(value: string | string[] | undefined) {
    const raw = this.firstValue(value);
    if (raw === undefined) return undefined;
    return raw === 'true' || raw === '1';
  }

  private optionalStringArray(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value;
    const raw = this.firstValue(value);
    if (!raw) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Fall through to comma-separated form data.
    }
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private optionalJson(value: string | string[] | undefined) {
    const raw = this.firstValue(value);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Record<string, string | number | boolean>;
    } catch {
      throw new ForbiddenException('specifications must be valid JSON');
    }
  }

  private firstValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }
}
