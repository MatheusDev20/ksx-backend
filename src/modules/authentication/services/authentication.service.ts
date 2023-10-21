import { EmployeeService } from 'src/modules/employee/services/employee.service';
import { LoginDTO } from '../DTOs/login-controller.dto';
import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Hashing } from 'src/modules/security/interfaces/hashing';
import { InvalidCredentials, NotFoundEmail } from 'src/errors/messages';
import { JwtManager } from 'src/modules/security/interfaces/jwt';
import { Authentication } from 'src/@types';
import { JwtData } from 'src/modules/security/DTOs/jwt/jwt-dto';

@Injectable()
export class AuthenticationService implements Authentication {
  constructor(
    private employeeService: EmployeeService,
    @Inject('HashingService') private hashService: Hashing,
    @Inject('JwtManager') private jwtManager: JwtManager,
  ) {}

  async login(data: LoginDTO): Promise<JwtData> {
    const { email, password } = data;
    const findUser = await this.employeeService.find('email', email);

    if (!findUser) throw new NotFoundException(NotFoundEmail);

    const { id, name } = findUser;
    if (await this.hashService.compare(password, findUser.password)) {
      const jwtData = await this.jwtManager.generate({
        username: name,
        sub: String(id),
      });

      const { refreshToken } = jwtData;
      await this.employeeService.storeRefreshToken(findUser, refreshToken);

      return { ...jwtData, user: findUser, refreshToken };
    }

    throw new UnauthorizedException(InvalidCredentials);
  }

  async refresh(token: string): Promise<JwtData> {
    try {
      await this.jwtManager.verifyToken(token, { refresh: true });
      const existedToken = await this.employeeService.getRefreshToken(token);

      if (!existedToken) {
        console.log('claro');
        throw new UnauthorizedException('Unauthorized Request');
      }

      const user = existedToken.userId;
      const jwtData = await this.jwtManager.generate({
        username: user.name,
        sub: String(user.id),
      });

      const { refreshToken } = jwtData;

      /* Update the Refresh Token on the DB - Invalidate the old one */
      await this.employeeService.storeRefreshToken(user, refreshToken);

      return { ...jwtData, user, refreshToken };
    } catch (err) {
      throw new UnauthorizedException('Unauthorized Request');
    }
  }
}
