import { ForbiddenException } from '@nestjs/common';

export class UserInactiveException extends ForbiddenException {
  constructor() {
    super('User account is inactive.');
  }
}
