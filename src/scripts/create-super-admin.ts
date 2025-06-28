import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { Role } from '../auth/enums/role.enum';
import { envConfig } from '../config/env.config';

async function createSuperAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    // Verifica se já existe um super admin
    const existingSuperAdmin = await usersService.findByEmail(envConfig.superAdmin.email);
    
    if (existingSuperAdmin) {
      await app.close();
      return;
    }

    // Cria o super admin
    const superAdmin = await usersService.create({
      email: envConfig.superAdmin.email,
      password: envConfig.superAdmin.password,
      name: 'Super Administrador',
      role: Role.SUPER_ADMIN,
    });

    console.log('Super Admin criado com sucesso!');
    console.log(`Email: ${superAdmin.email}`);
    console.log(`Senha: ${envConfig.superAdmin.password}`);
    console.log('⚠️  ALTERE A SENHA APÓS O PRIMEIRO LOGIN!');
    
  } catch (error) {
    console.error('❌ Erro ao criar Super Admin:', error.message);
  } finally {
    await app.close();
  }
}

// Executa o script se for chamado diretamente
if (require.main === module) {
  createSuperAdmin();
}

export { createSuperAdmin }; 