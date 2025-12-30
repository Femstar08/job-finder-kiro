import { BaseRepository } from './BaseRepository';
import { User, CreateUserRequest } from '../../types';
import bcrypt from 'bcrypt';

export class UserRepository extends BaseRepository {
  async create(userData: CreateUserRequest): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const { data, error } = await this.db.from('jf_users')
      .insert({
        email: userData.email,
        password_hash: hashedPassword,
        first_name: userData.firstName || null,
        last_name: userData.lastName || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return {
      id: data.id,
      email: data.email,
      passwordHash: data.password_hash,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.db.from('jf_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return {
      id: data.id,
      email: data.email,
      passwordHash: data.password_hash,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.db.from('jf_users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return {
      id: data.id,
      email: data.email,
      passwordHash: data.password_hash,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async updateProfile(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>): Promise<User> {
    const updateData: any = {};

    if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }

    const { data, error } = await this.db.from('jf_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return {
      id: data.id,
      email: data.email,
      passwordHash: data.password_hash,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return null;
    }

    return user;
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const { error } = await this.db.from('jf_users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from('jf_users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async exists(email: string): Promise<boolean> {
    const { data, error } = await this.db.from('jf_users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (error) {
      throw new Error(`Failed to check user existence: ${error.message}`);
    }

    return data.length > 0;
  }
}