import { IsIn } from 'class-validator';
import { RoutingMethod } from '@leadarrow/shared';

const METHODS = [RoutingMethod.RoundRobin, RoutingMethod.Percentage];

export class UpdateRoutingConfigDto {
  @IsIn(METHODS, { message: `routingMethod must be one of: ${METHODS.join(', ')}` })
  routingMethod!: RoutingMethod;
}
