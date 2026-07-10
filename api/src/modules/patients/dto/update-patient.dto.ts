import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';

/**
 * All create fields become optional. Nested collections (allergies, histories)
 * are intentionally managed via their own endpoints, not bulk-replaced here.
 */
export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
