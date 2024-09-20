import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface User {
  _id?: string;
  username: string;
  userType: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  userForm: FormGroup;
  users: User[] = [];
  editingUser: User | null = null;
  displayedColumns: string[] = ['username', 'userType', 'actions'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      userType: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.http.get<User[]>(`${environment.apiUrl}/auth/users`).subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showSnackBar('Error loading users');
      }
    });
  }

  onSubmit() {
    if (this.userForm.valid) {
      const userData = this.userForm.value;
      if (this.editingUser) {
        this.updateUser(userData);
      } else {
        this.addUser(userData);
      }
    }
  }

  addUser(userData: User) {
    this.http.post<User>(`${environment.apiUrl}/auth/register`, userData).subscribe({
      next: (newUser) => {
        this.users.push(newUser);
        this.resetForm();
        this.showSnackBar('User added successfully');
      },
      error: (error) => {
        console.error('Error adding user:', error);
        this.showSnackBar('Error adding user');
      }
    });
  }

  updateUser(userData: User) {
    if (!this.editingUser?._id) return;
    this.http.put<User>(`${environment.apiUrl}/auth/users/${this.editingUser._id}`, userData).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(user => user._id === updatedUser._id);
        if (index !== -1) {
          this.users[index] = updatedUser;
          this.users = [...this.users];
        }
        this.resetForm();
        this.showSnackBar('User updated successfully');
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.showSnackBar('Error updating user');
      }
    });
  }

  editUser(user: User) {
    this.editingUser = user;
    this.userForm.patchValue({
      username: user.username,
      userType: user.userType
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  deleteUser(user: User) {
    if (!user._id) return;
    this.http.delete(`${environment.apiUrl}/auth/users/${user._id}`).subscribe({
      next: () => {
        this.users = this.users.filter(u => u._id !== user._id);
        this.showSnackBar('User deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.showSnackBar('Error deleting user');
      }
    });
  }

  resetForm() {
    this.userForm.reset();
    this.editingUser = null;
    this.userForm.get('password')?.setValidators(Validators.required);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
    });
  }
}