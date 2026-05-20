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
  form: Product = { productId: '', name: '', price: 0, imageUrl: '' };
  editingProductId: string | null = null;
  editForm = { name: '', price: 0, imageUrl: '' };
  deletingProduct: Product | null = null;
  isUploadingCreateImage = false;
  isUploadingEditImage = false;

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
    const imageUrl = this.form.imageUrl?.trim();

    if (!productId || !name) {
      this.error = 'Debes diligenciar productId y name para guardar el producto.';
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      this.error = 'El precio debe ser un numero valido mayor o igual a 0.';
      return;
    }

    this.api.createProduct({ productId, name, price, imageUrl }).subscribe({
      next: (response) => {
        const successMessage = response?.message?.trim();
        this.message = successMessage ? successMessage : 'Producto guardado correctamente.';
        this.form.productId = '';
        this.form.name = '';
        this.form.price = 0;
        this.form.imageUrl = '';
        this.cdr.detectChanges();
        this.loadProducts(true);
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo crear producto');
      },
    });
  }

  editProduct(product: Product): void {
    this.message = '';
    this.error = '';
    this.editingProductId = product.productId;
    this.editForm.name = product.name;
    this.editForm.price = product.price;
    this.editForm.imageUrl = product.imageUrl ?? '';
  }

  cancelEditProduct(): void {
    this.editingProductId = null;
    this.editForm.name = '';
    this.editForm.price = 0;
    this.editForm.imageUrl = '';
  }

  saveEditProduct(): void {
    this.message = '';
    this.error = '';

    if (!this.editingProductId) {
      return;
    }

    const nextName = this.editForm.name.trim();
    const nextPrice = Number(this.editForm.price);
    const nextImageUrl = this.editForm.imageUrl?.trim();

    if (!nextName) {
      this.error = 'Debes diligenciar name para actualizar el producto.';
      return;
    }

    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      this.error = 'El precio debe ser un numero valido mayor o igual a 0.';
      return;
    }

    this.api.updateProduct(this.editingProductId, { name: nextName, price: nextPrice, imageUrl: nextImageUrl }).subscribe({
      next: (response) => {
        const successMessage = response?.message?.trim();
        this.message = successMessage ? successMessage : 'Producto actualizado correctamente.';
        this.cancelEditProduct();
        this.loadProducts(true);
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo actualizar producto');
      },
    });
  }

  requestDeleteProduct(product: Product): void {
    this.message = '';
    this.error = '';
    this.deletingProduct = product;
  }

  cancelDeleteProduct(): void {
    this.deletingProduct = null;
  }

  confirmDeleteProduct(): void {
    if (!this.deletingProduct) {
      return;
    }

    this.api.deleteProduct(this.deletingProduct.productId).subscribe({
      next: (response) => {
        const successMessage = response?.message?.trim();
        this.message = successMessage ? successMessage : 'Producto eliminado correctamente.';
        this.deletingProduct = null;
        this.loadProducts(true);
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo eliminar producto');
      },
    });
  }

  onCreateImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploadProductImage(file, 'create');
    input.value = '';
  }

  onEditImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploadProductImage(file, 'edit');
    input.value = '';
  }

  private uploadProductImage(file: File, mode: 'create' | 'edit'): void {
    this.message = '';
    this.error = '';

    if (mode === 'create') {
      this.isUploadingCreateImage = true;
    } else {
      this.isUploadingEditImage = true;
    }

    this.api
      .createProductUploadUrl({ fileName: file.name, contentType: file.type || 'application/octet-stream' })
      .subscribe({
        next: ({ uploadUrl, imageUrl }) => {
          fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: file,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error('No se pudo subir la imagen a S3.');
              }

              if (mode === 'create') {
                this.form.imageUrl = imageUrl;
              } else {
                this.editForm.imageUrl = imageUrl;
              }

              this.message = 'Imagen subida correctamente.';
            })
            .catch((err) => {
              this.error = this.getApiError(err, 'No se pudo subir la imagen');
            })
            .finally(() => {
              if (mode === 'create') {
                this.isUploadingCreateImage = false;
              } else {
                this.isUploadingEditImage = false;
              }
              this.cdr.detectChanges();
            });
        },
        error: (err) => {
          this.error = this.getApiError(err, 'No se pudo generar URL de subida');
          if (mode === 'create') {
            this.isUploadingCreateImage = false;
          } else {
            this.isUploadingEditImage = false;
          }
          this.cdr.detectChanges();
        },
      });
  }

  private getApiError(err: any, fallback: string): string {
    return err?.error?.error ?? err?.error?.message ?? err?.message ?? fallback;
  }
}
