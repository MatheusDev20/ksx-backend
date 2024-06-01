import { Employee } from 'src/modules/employee/entities/employee.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  brand_image: string;

  @OneToMany(() => Employee, (employee) => employee.organization)
  employees: Employee[];
}
