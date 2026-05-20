import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Product } from '../../shared/models/api.models';

@Component({
  selector: 'app-products-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products-tab.component.html',
  styleUrls: ['./products-tab.component.css'],
})
export class ProductsTabComponent implements OnInit {
  products: Product[] = [];
  message = '';
  error = '';
  form: Product = { productId: '', name: '', price: 0 };

  constructor(
    private readonly api: ApiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.loadProducts();
    });
  }

  loadProducts(preserveStatus = false): void {
    if (!preserveStatus) {
      this.message = '';
      this.error = '';
    }

    this.api.getProducts().subscribe({
      next: (response) => {
        this.products = response.items ?? [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo cargar productos');
        this.cdr.detectChanges();
      },
    });
  }

  createProduct(): void {
    this.message = '';
    this.error = '';

    const productId = this.form.productId.trim();
    const name = this.form.name.trim();
    const price = Number(this.form.price);

    if (!productId || !name) {
      this.error = 'Debes diligenciar productId y name para guardar el producto.';
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      this.error = 'El precio debe ser un numero valido mayor o igual a 0.';
      return;
    }

    this.api.createProduct({ productId, name, price }).subscribe({
      next: (response) => {
        const successMessage = response?.message?.trim();
        this.message = successMessage ? successMessage : 'Producto guardado correctamente.';
        this.form.productId = '';
        this.form.name = '';
        this.form.price = 0;
        this.cdr.detectChanges();
        this.loadProducts(true);
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo crear producto');
      },
    });
  }

  private getApiError(err: any, fallback: string): string {
    return err?.error?.error ?? err?.error?.message ?? fallback;
  }
}
