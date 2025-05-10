import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, ValidateIf } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * DTO for search by date range operations
 */
export class SearchByDateRangeDto extends PaginationDto {
  /**
   * Start date for the range (inclusive)
   * @example "2023-01-01"
   */
  @ApiProperty({
    description: 'Start date (format: YYYY-MM-DD)',
    example: '2023-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString(
    { strict: false }, // less strict to allow YYYY-MM-DD format
    { message: 'From date must be a valid date string (YYYY-MM-DD)' },
  )
  from?: string;

  /**
   * End date for the range (inclusive)
   * @example "2023-01-31"
   */
  @ApiProperty({
    description: 'End date (format: YYYY-MM-DD)',
    example: '2023-01-31',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.from !== undefined || o.to !== undefined)
  @IsDateString(
    { strict: false }, // less strict to allow YYYY-MM-DD format
    { message: 'To date must be a valid date string (YYYY-MM-DD)' },
  )
  to?: string;

  /**
   * Custom validation method to check the date range
   * Only used by the IsValidDateRange validator
   *
   * @returns Object with from and to dates for validation
   */
  validateDateRange() {
    return { from: this.from, to: this.to };
  }
}
