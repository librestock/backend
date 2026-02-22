import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { Permission, Resource } from '@librestock/types';
import { type Response } from 'express';
import { RequirePermission } from '../../common/decorators';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import {
  getUserIdFromSession,
  getUserSession,
  type AuthRequest,
} from '../../common/auth/session';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { HateoasInterceptor } from '../../common/hateoas/hateoas.interceptor';
import { StandardThrottle } from '../../common/decorators/throttle.decorator';
import { PhotoResponseDto } from './dto';
import { PhotosService } from './photos.service';
import { PhotoHateoas } from './photos.hateoas';

@ApiTags('Photos')
@ApiBearerAuth()
@StandardThrottle()
@UseGuards(PermissionGuard)
@RequirePermission(Resource.PRODUCTS, Permission.READ)
@Controller()
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('products/:productId/photos')
  @RequirePermission(Resource.PRODUCTS, Permission.WRITE)
  @UseInterceptors(
    HateoasInterceptor,
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  @PhotoHateoas()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a photo for a product',
    operationId: 'uploadProductPhoto',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP, GIF)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: PhotoResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async uploadPhoto(
    @Param('productId', ParseUUIDPipe) productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ): Promise<PhotoResponseDto> {
    const userId = getUserIdFromSession(getUserSession(req));
    return this.photosService.uploadPhoto(
      productId,
      file,
      userId ?? undefined,
    );
  }

  @Get('products/:productId/photos')
  @ApiOperation({
    summary: 'List photos for a product',
    operationId: 'listProductPhotos',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID',
    type: String,
  })
  @ApiResponse({ status: 200, type: [PhotoResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listPhotos(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<PhotoResponseDto[]> {
    return this.photosService.findByProductId(productId);
  }

  @Get('photos/:id/file')
  @ApiOperation({
    summary: 'Serve a photo file',
    operationId: 'getPhotoFile',
  })
  @ApiParam({ name: 'id', description: 'Photo UUID', type: String })
  @ApiResponse({ status: 200, description: 'The image file' })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getPhotoFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { filePath, mimetype, filename } =
      await this.photosService.getFilePath(id);

    res.setHeader('Content-Type', mimetype);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(filename)}"`,
    );
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  }

  @Delete('photos/:id')
  @RequirePermission(Resource.PRODUCTS, Permission.WRITE)
  @ApiOperation({
    summary: 'Delete a photo',
    operationId: 'deletePhoto',
  })
  @ApiParam({ name: 'id', description: 'Photo UUID', type: String })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async deletePhoto(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.photosService.deletePhoto(id);
    return { message: 'Photo deleted successfully' };
  }
}
