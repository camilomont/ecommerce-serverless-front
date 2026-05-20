import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { User } from '../../shared/models/api.models';

@Component({
  selector: 'app-users-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-tab.component.html',
  styleUrls: ['./users-tab.component.css'],
})
export class UsersTabComponent implements OnInit {
  users: User[] = [];
  message = '';
  error = '';
  form: User = { userId: '', name: '', email: '' };
  editingUserId: string | null = null;
  editForm = { name: '', email: '' };
  deletingUser: User | null = null;

  constructor(
    private readonly api: ApiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.loadUsers();
    });
  }

  loadUsers(preserveStatus = false): void {
    if (!preserveStatus) {
      this.message = '';
      this.error = '';
    }

    this.api.getUsers().subscribe({
      next: (response) => {
        this.users = response.items ?? [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo cargar usuarios');
        this.cdr.detectChanges();
      },
    });
  }

  createUser(): void {
    this.message = '';
    this.error = '';

    const userId = this.form.userId.trim();
    const name = this.form.name.trim();
    const email = this.form.email.trim();

    if (!userId || !name || !email) {
      this.error = 'Debes diligenciar userId, name y email para guardar el usuario.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      this.error = 'El email no tiene un formato valido.';
      return;
    }

    this.api.createUser({ userId, name, email }).subscribe({
      next: (response) => {
        const successMessage = response?.message?.trim();
        this.message = successMessage ? successMessage : 'Usuario guardado correctamente.';
        this.form.userId = '';
        this.form.name = '';
        this.form.email = '';
        this.loadUsers(true);
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo crear usuario');
      },
    });
  }

  editUser(user: User): void {
    this.message = '';
    this.error = '';
    this.editingUserId = user.userId;
    this.editForm.name = user.name;
    this.editForm.email = user.email;
  }

  cancelEditUser(): void {
    this.editingUserId = null;
    this.editForm.name = '';
    this.editForm.email = '';
  }

  saveEditUser(): void {
    this.message = '';
    this.error = '';

    if (!this.editingUserId) {
      return;
    }

    const nextName = this.editForm.name.trim();
    const nextEmail = this.editForm.email.trim();

    if (!nextName || !nextEmail) {
      this.error = 'Debes diligenciar name y email para actualizar el usuario.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(nextEmail)) {
      this.error = 'El email no tiene un formato valido.';
      return;
    }

    this.api.updateUser(this.editingUserId, { name: nextName, email: nextEmail }).subscribe({
      next: (response) => {
        const successMessage = response?.message?.trim();
        this.message = successMessage ? successMessage : 'Usuario actualizado correctamente.';
        this.cancelEditUser();
        this.loadUsers(true);
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo actualizar usuario');
      },
    });
  }

  requestDeleteUser(user: User): void {
    this.message = '';
    this.error = '';
    this.deletingUser = user;
  }

  cancelDeleteUser(): void {
    this.deletingUser = null;
  }

  confirmDeleteUser(): void {
    if (!this.deletingUser) {
      return;
    }

    this.api.deleteUser(this.deletingUser.userId).subscribe({
      next: (response) => {
        const successMessage = response?.message?.trim();
        this.message = successMessage ? successMessage : 'Usuario eliminado correctamente.';
        this.deletingUser = null;
        this.loadUsers(true);
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo eliminar usuario');
      },
    });
  }

  private getApiError(err: any, fallback: string): string {
    return err?.error?.error ?? err?.error?.message ?? err?.message ?? fallback;
  }
}
