import { PartialType } from '@nestjs/swagger';
import { CreateTerpeneDto } from './create-terpene.dto';

export class UpdateTerpeneDto extends PartialType(CreateTerpeneDto) {}
