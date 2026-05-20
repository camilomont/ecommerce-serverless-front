import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { UsersTabComponent } from '../users/users-tab.component';
import { ProductsTabComponent } from '../products/products-tab.component';
import { OrdersTabComponent } from '../orders/orders-tab.component';

type TabKey = 'users' | 'products' | 'orders';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, UsersTabComponent, ProductsTabComponent, OrdersTabComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements AfterViewInit {
  activeTab: TabKey = 'users';

  @ViewChild(UsersTabComponent) private usersTab?: UsersTabComponent;
  @ViewChild(ProductsTabComponent) private productsTab?: ProductsTabComponent;
  @ViewChild(OrdersTabComponent) private ordersTab?: OrdersTabComponent;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.refreshActiveTab();
    });
  }

  selectTab(tab: TabKey): void {
    this.activeTab = tab;

    setTimeout(() => {
      this.refreshActiveTab();
    });
  }

  private refreshActiveTab(): void {
    if (this.activeTab === 'users') {
      this.usersTab?.loadUsers();
      return;
    }

    if (this.activeTab === 'products') {
      this.productsTab?.loadProducts();
      return;
    }

    if (this.activeTab === 'orders') {
      this.ordersTab?.refreshPurchases();
    }
  }
}
