import { Validate } from 'class-validator';
import { IsUnique } from './is-unique.validator';

export function CompositeUnique(
  entity: string,
  fields: string[],
  ignoreIdField?: string,
) {
  console.log('entity', entity);
  console.log('fields', fields);
  console.log('ignoreIdField', ignoreIdField);
  return Validate(IsUnique, [{ entity, fields, ignoreIdField }]);
}
