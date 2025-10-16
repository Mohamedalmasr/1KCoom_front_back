import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { ContactService } from './contact.service';
import { ContactController, AdminContactsController } from './contact.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contact])],
  controllers: [ContactController, AdminContactsController],
  providers: [ContactService],
  exports: [TypeOrmModule],
})
export class ContactModule {}
