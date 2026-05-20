import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Product, Purchase, User } from '../../shared/models/api.models';
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = this.getApiError(err, 'No se pudo cargar compras');
        this.cdr.detectChanges();
      },
    });
  }

  createPurchase(): void {
    this.message = '';
    this.error = '';

    const userId = this.purchaseForm.userId.trim();
    const productId = this.purchaseForm.productId.trim();
    const quantity = Number(this.purchaseForm.quantity);
    const currentLookupUserId = this.lookupUserId.trim();

    if (!userId || !productId) {
      this.error = 'Debes diligenciar userId y productId para registrar la compra.';
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      this.error = 'La cantidad debe ser un numero entero mayor o igual a 1.';
      return;
    }

    this.validatePurchaseRelation(userId, productId)
      .pipe(
        switchMap(() =>
          this.api.createOrder(userId, {
            productId,
            quantity,
          }),
        ),
      )
      .subscribe({
        next: (response) => {
          const successMessage = response?.message?.trim();
          this.message = successMessage ? successMessage : 'Compra registrada correctamente.';
          this.purchaseForm.userId = '';
          this.purchaseForm.productId = '';
          this.purchaseForm.quantity = 1;
          this.cdr.detectChanges();
          if (currentLookupUserId) {
            this.loadPurchases(true);
            return;
          }

          this.loadAllPurchases(true);
        },
        error: (err) => {
          this.error = this.getPurchaseError(err);
          this.cdr.detectChanges();
        },
      });
  }

  private getApiError(err: any, fallback: string): string {
    const apiError = err?.error?.error;
    if (typeof apiError === 'string' && apiError.trim()) {
      return apiError.trim();
    }

    const apiMessage = err?.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage.trim();
    }

    if (typeof err?.error === 'string' && err.error.trim()) {
      return err.error.trim();
    }

    if (typeof err?.message === 'string' && err.message.trim()) {
      return err.message.trim();
    }

    return fallback;
  }

  private getPurchaseError(err: any): string {
    if (err?.status === 500) {
      const backendMessage = this.getApiError(err, 'La API fallo al registrar la compra.');
      return `${backendMessage} Error 500: la validacion del front paso, pero el backend no pudo guardar la compra.`;
    }

    if (err?.status === 404) {
      return this.getApiError(
        err,
        'No se encontro el userId o el productId relacionado para registrar la compra.',
      );
    }

    if (err?.status === 400) {
      return this.getApiError(
        err,
        'Los datos enviados para la compra no son validos.',
      );
    }

    return this.getApiError(err, 'No se pudo registrar compra');
  }

  private loadAllPurchases(preserveStatus = false): void {
    if (!preserveStatus) {
      this.message = '';
      this.error = '';
    }

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
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = this.getApiError(err, 'No se pudo refrescar la lista de compras');
          this.cdr.detectChanges();
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

  private validatePurchaseRelation(userId: string, productId: string) {
    return forkJoin({
      users: this.api.getUsers(1000).pipe(
        map((response) => response.items ?? []),
        catchError(() => of([] as User[])),
      ),
      products: this.api.getProducts(1000).pipe(
        map((response) => response.items ?? []),
        catchError(() => of([] as Product[])),
      ),
    }).pipe(
      map(({ users, products }) => {
        const userExists = users.some((user) => user.userId === userId);
        if (!userExists) {
          throw new Error(`No se encontro el userId "${userId}". No se puede registrar la compra.`);
        }

        const productExists = products.some((product) => product.productId === productId);
        if (!productExists) {
          throw new Error(`No se encontro el productId "${productId}". No se puede registrar la compra.`);
        }

        return true;
      }),
    );
  }
}
