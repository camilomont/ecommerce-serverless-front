import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Purchase } from '../../shared/models/api.models';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-orders-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders-tab.component.html',
  styleUrls: ['./orders-tab.component.css'],
})
export class OrdersTabComponent {
  purchases: Purchase[] = [];
  lookupUserId = '';
  message = '';
  error = '';
  purchaseForm = {
    userId: '',
    productId: '',
    quantity: 1,
  };

  constructor(
    private readonly api: ApiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.refreshPurchases();
  }

  refreshIfReady(): void {
    if (this.lookupUserId.trim()) {
      this.loadPurchases();
    }
  }

  refreshPurchases(): void {
    const userId = this.lookupUserId.trim();
    if (!userId) {
      this.loadAllPurchases();
      return;
    }

    this.loadPurchases();
  }

  loadPurchases(preserveStatus = false): void {
    if (!preserveStatus) {
      this.message = '';
      this.error = '';
    }

    this.lookupUserId = this.lookupUserId.trim();

    if (!this.lookupUserId) {
      this.error = 'Debes indicar userId para consultar compras';
      return;
    }

    this.api.getOrdersByUser(this.lookupUserId).subscribe({
      next: (response) => {
        this.purchases = this.extractPurchases(response);
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo cargar compras');
      },
    });
  }

  createPurchase(): void {
    this.message = '';
    this.error = '';

    const userId = this.purchaseForm.userId.trim();
    const productId = this.purchaseForm.productId.trim();
    const quantity = Number(this.purchaseForm.quantity);

    if (!userId || !productId) {
      this.error = 'Debes diligenciar userId y productId para registrar la compra.';
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      this.error = 'La cantidad debe ser un numero entero mayor o igual a 1.';
      return;
    }

    this.api
      .createOrder(userId, {
        productId,
        quantity,
      })
      .subscribe({
        next: (response) => {
          const successMessage = response?.message?.trim();
          this.message = successMessage ? successMessage : 'Compra registrada correctamente.';
          this.lookupUserId = userId;
          this.purchaseForm.userId = '';
          this.purchaseForm.productId = '';
          this.purchaseForm.quantity = 1;
          this.cdr.detectChanges();
          if (this.lookupUserId === userId) {
            this.loadPurchases(true);
          }
        },
        error: (err) => {
          this.error = this.getApiError(err, 'No se pudo registrar compra');
        },
      });
  }

  private getApiError(err: any, fallback: string): string {
    return err?.error?.error ?? err?.error?.message ?? fallback;
  }

  private loadAllPurchases(): void {
    this.message = '';
    this.error = '';

    this.api
      .getUsers(100)
      .pipe(
        map((response) => response.items ?? []),
        switchMap((users) => {
          if (!users.length) {
            return of([] as Purchase[]);
          }

          const requests = users.map((user) =>
            this.api.getOrdersByUser(user.userId).pipe(
              map((response) => this.extractPurchases(response)),
              catchError(() => of([] as Purchase[])),
            ),
          );

          return forkJoin(requests).pipe(
            map((groupedPurchases) => groupedPurchases.flat()),
            map((purchases) =>
              purchases.sort(
                (a, b) =>
                  new Date(b.purchaseDate ?? 0).getTime() - new Date(a.purchaseDate ?? 0).getTime(),
              ),
            ),
          );
        }),
      )
      .subscribe({
        next: (purchases) => {
          this.purchases = purchases;
          this.message = purchases.length
            ? `Se cargaron ${purchases.length} compras.`
            : 'No hay compras para mostrar.';
        },
        error: (err) => {
          this.error = this.getApiError(err, 'No se pudo refrescar la lista de compras');
        },
      });
  }

  private extractPurchases(response: any): Purchase[] {
    const items = response?.items;
    if (Array.isArray(items)) {
      return items;
    }

    const purchases = response?.purchases;
    if (Array.isArray(purchases)) {
      return purchases;
    }

    const orders = response?.orders;
    if (Array.isArray(orders)) {
      return orders;
    }

    return [];
  }
}
