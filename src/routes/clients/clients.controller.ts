import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { HateoasInterceptor } from '../../common/hateoas/hateoas.interceptor';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { AuditAction, AuditEntityType } from '../../common/enums';
import { StandardThrottle } from '../../common/decorators/throttle.decorator';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientResponseDto,
  ClientQueryDto,
  PaginatedClientsResponseDto,
} from './dto';
import { ClientsService } from './clients.service';
import { ClientHateoas, DeleteClientHateoas } from './clients.hateoas';

@ApiTags('Clients')
@ApiBearerAuth()
@StandardThrottle()
@Controller()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @UseInterceptors(HateoasInterceptor)
  @ClientHateoas()
  @ApiOperation({
    summary: 'List clients with pagination and filtering',
    operationId: 'listClients',
  })
  @ApiResponse({ status: 200, type: PaginatedClientsResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listClients(
    @Query() query: ClientQueryDto,
  ): Promise<PaginatedClientsResponseDto> {
    return this.clientsService.findAllPaginated(query);
  }

  @Get(':id')
  @UseInterceptors(HateoasInterceptor)
  @ClientHateoas()
  @ApiOperation({ summary: 'Get client by ID', operationId: 'getClient' })
  @ApiParam({ name: 'id', description: 'Client UUID', type: String })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getClient(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    return this.clientsService.findOne(id);
  }

  @Post()
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @ClientHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.CLIENT,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({ summary: 'Create client', operationId: 'createClient' })
  @ApiResponse({ status: 201, type: ClientResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async createClient(
    @Body() createClientDto: CreateClientDto,
  ): Promise<ClientResponseDto> {
    return this.clientsService.create(createClientDto);
  }

  @Put(':id')
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @ClientHateoas()
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.CLIENT,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Update client', operationId: 'updateClient' })
  @ApiParam({ name: 'id', description: 'Client UUID', type: String })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async updateClient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @DeleteClientHateoas()
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.CLIENT,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Delete client', operationId: 'deleteClient' })
  @ApiParam({ name: 'id', description: 'Client UUID', type: String })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async deleteClient(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.clientsService.delete(id);
    return { message: 'Client deleted successfully' };
  }
}
