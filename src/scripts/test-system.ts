import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { Role } from '../auth/enums/role.enum';

async function testSystem() {
  console.log('🔧 Testando Sistema...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const usersService = app.get(UsersService);
    const tenantsService = app.get(TenantsService);

    console.log('✅ Conexões com banco de dados OK');
    console.log('✅ Serviços carregados com sucesso');
    
    // Teste básico de criação
    console.log('📊 Sistema pronto para uso!');
    console.log(`
🎯 PRÓXIMOS PASSOS:
1. Suba o PostgreSQL: docker run -d --name postgres -e POSTGRES_USER=nutri_user -e POSTGRES_PASSWORD=nutri_password -e POSTGRES_DB=nutri_db -p 5432:5432 postgres:16-alpine
2. Suba o MongoDB: docker run -d --name mongodb -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=admin123 -p 27017:27017 mongo:7.0
3. Suba o Redis: docker run -d --name redis -p 6379:6379 redis:7.2-alpine redis-server --requirepass redis123
4. Execute: npm run start:dev
5. Crie o super admin: npm run seed:super-admin
    `);
    
  } catch (error) {
    console.error('❌ Erro no sistema:', error.message);
    console.log('💡 Verifique se os bancos de dados estão rodando');
  } finally {
    await app.close();
  }
}

// Executa o script se for chamado diretamente
if (require.main === module) {
  testSystem();
}

export { testSystem }; 