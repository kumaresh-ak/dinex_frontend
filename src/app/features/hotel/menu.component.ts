import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { MenuApi } from '../../core/api/menu.api';
import { assetUrl, saveBlob } from '../../core/files';
import { FoodType, MenuCategory, MenuCategoryRequest, MenuItem, MenuItemRequest, MenuQrInfo } from '../../core/models';
import { HumanizePipe } from '../../core/ui';

const blankCategory = (): MenuCategoryRequest => ({ name: '', displayPriority: 0, enabled: true });

const blankItem = (): MenuItemRequest => ({
  categoryId: 0,
  name: '',
  description: '',
  price: 0,
  preparationMinutes: 10,
  foodType: 'VEG',
  displayPriority: 0,
  available: true,
  visible: true,
});

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, HumanizePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Menu</h1>
        <p class="muted">Categories group the dishes guests see. Unavailable items cannot be ordered.</p>
      </div>
    </header>

    <section class="card menu-qr-card">
      <div class="qr-text">
        <h2>Common menu QR code</h2>
        <p class="muted small">
          One code for all tables. Guests scan it, choose their table, view the menu and place orders. Print it and keep it on every table.
        </p>
        @if (menuQr(); as info) {
          @if (info.generated) {
            @if (info.url) {
              <p class="small muted word-break">{{ info.url }}</p>
            }
            <div class="row">
              <button class="btn btn-primary" type="button" [disabled]="qrBusy()" (click)="downloadMenuQr()">Download PNG</button>
              <button class="btn" type="button" [disabled]="qrBusy()" (click)="generateMenuQr()">Regenerate</button>
            </div>
            <p class="small muted">Regenerating stops the old code from working.</p>
          } @else {
            <p class="small muted">Add at least one dish to the menu, then generate the code.</p>
            <div class="row">
              <button class="btn btn-primary" type="button" [disabled]="qrBusy()" (click)="generateMenuQr()">Generate menu QR code</button>
            </div>
          }
        }
      </div>
      @if (qrImage(); as src) {
        <img class="menu-qr-image" [src]="src" alt="Common menu QR code" width="160" height="160" />
      }
    </section>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    <div class="grid-2">
      <section class="card">
        <h2>{{ categoryId === null ? 'Add category' : 'Edit category' }}</h2>
        <form #categoryFormRef="ngForm" (ngSubmit)="saveCategory()">
          <label class="field">
            <span>Name</span>
            <input class="input" name="categoryName" required maxlength="100" [(ngModel)]="categoryForm.name" />
          </label>
          <label class="field">
            <span>Display order</span>
            <input class="input" name="categoryPriority" type="number" required [(ngModel)]="categoryForm.displayPriority" />
          </label>
          <label class="radio">
            <input type="checkbox" name="categoryEnabled" [(ngModel)]="categoryForm.enabled" />
            Shown to guests
          </label>
          <div class="row">
            <button class="btn btn-primary" type="submit" [disabled]="busy() || categoryFormRef.invalid">Save category</button>
            @if (categoryId !== null) {
              <button class="btn btn-ghost" type="button" (click)="resetCategory()">Cancel</button>
            }
          </div>
        </form>

        <ul class="plain">
          @for (category of categories(); track category.id) {
            <li class="row between">
              <span>
                {{ category.name }}
                <span class="small muted">({{ category.itemCount }} items{{ category.enabled ? '' : ', hidden' }})</span>
              </span>
              <span class="row">
                <button class="btn btn-sm" type="button" (click)="editCategory(category)">Edit</button>
                <button class="btn btn-sm btn-danger" type="button" (click)="removeCategory(category)">Delete</button>
              </span>
            </li>
          } @empty {
            <li class="muted small">No categories yet.</li>
          }
        </ul>
      </section>

      <section class="card">
        <h2>{{ itemId === null ? 'Add dish' : 'Edit dish' }}</h2>
        <form #itemFormRef="ngForm" (ngSubmit)="saveItem()">
          <label class="field">
            <span>Category</span>
            <select class="input" name="itemCategory" required [(ngModel)]="itemForm.categoryId">
              <option [ngValue]="0" disabled>Choose a category</option>
              @for (category of categories(); track category.id) {
                <option [ngValue]="category.id">{{ category.name }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Dish name</span>
            <input class="input" name="itemName" required maxlength="160" [(ngModel)]="itemForm.name" />
          </label>
          <label class="field">
            <span>Description</span>
            <textarea class="input" name="itemDescription" rows="2" maxlength="1000" [(ngModel)]="itemForm.description"></textarea>
          </label>
          <div class="form-grid">
            <label class="field">
              <span>Price (INR)</span>
              <input class="input" name="itemPrice" type="number" min="0.01" step="0.01" required [(ngModel)]="itemForm.price" />
            </label>
            <label class="field">
              <span>Preparation (minutes)</span>
              <input class="input" name="itemPrep" type="number" min="1" max="240" required [(ngModel)]="itemForm.preparationMinutes" />
            </label>
            <label class="field">
              <span>Food type</span>
              <select class="input" name="itemFood" [(ngModel)]="itemForm.foodType">
                @for (type of foodTypes; track type) {
                  <option [value]="type">{{ type | humanize }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span>Display order</span>
              <input class="input" name="itemPriority" type="number" required [(ngModel)]="itemForm.displayPriority" />
            </label>
          </div>
          <div class="row">
            <label class="radio"><input type="checkbox" name="itemAvailable" [(ngModel)]="itemForm.available" /> Available</label>
            <label class="radio"><input type="checkbox" name="itemVisible" [(ngModel)]="itemForm.visible" /> Visible</label>
          </div>
          <div class="row">
            <button class="btn btn-primary" type="submit" [disabled]="busy() || itemFormRef.invalid">Save dish</button>
            @if (itemId !== null) {
              <button class="btn btn-ghost" type="button" (click)="resetItem()">Cancel</button>
            }
          </div>
        </form>
      </section>
    </div>

    <section class="card">
      <div class="toolbar">
        <h2 class="grow">Dishes</h2>
        <select class="input" name="filterCategory" [ngModel]="filterCategory()" (ngModelChange)="setFilter($event)">
          <option [ngValue]="null">All categories</option>
          @for (category of categories(); track category.id) {
            <option [ngValue]="category.id">{{ category.name }}</option>
          }
        </select>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Category</th>
              <th>Price</th>
              <th>Type</th>
              <th>Available</th>
              <th>Visible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td>
                  <div class="row">
                    @if (assetUrl(item.imageUrl); as src) {
                      <img class="menu-thumb" [src]="src" alt="" width="40" height="40" />
                    }
                    <div>
                      <strong>{{ item.name }}</strong>
                      <div class="small muted">{{ item.preparationMinutes }} min</div>
                    </div>
                  </div>
                </td>
                <td>{{ item.categoryName ?? '-' }}</td>
                <td>{{ item.price | currency: 'INR' : 'symbol' : '1.2-2' }}</td>
                <td>{{ item.foodType | humanize }}</td>
                <td>
                  <input type="checkbox" [checked]="item.available" (change)="toggleAvailable(item)" aria-label="Available" />
                </td>
                <td>
                  <input type="checkbox" [checked]="item.visible" (change)="toggleVisible(item)" aria-label="Visible" />
                </td>
                <td>
                  <div class="row">
                    <button class="btn btn-sm" type="button" (click)="editItem(item)">Edit</button>
                    <label class="btn btn-sm">
                      Photo
                      <input type="file" accept="image/*" hidden (change)="uploadImage(item, $event)" />
                    </label>
                    <button class="btn btn-sm btn-danger" type="button" (click)="removeItem(item)">Delete</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="muted">No dishes to show.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .menu-qr-card {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }
      .qr-text {
        flex: 1 1 280px;
      }
      .menu-qr-image {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 8px;
      }
      .word-break {
        word-break: break-all;
      }
    `,
  ],
})
export class MenuPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(MenuApi);

  readonly assetUrl = assetUrl;
  readonly foodTypes: FoodType[] = ['VEG', 'NON_VEG', 'EGG', 'VEGAN'];

  readonly categories = signal<MenuCategory[]>([]);
  readonly items = signal<MenuItem[]>([]);
  readonly filterCategory = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);
  readonly menuQr = signal<MenuQrInfo | null>(null);
  readonly qrImage = signal<string | null>(null);
  readonly qrBusy = signal(false);

  categoryId: number | null = null;
  categoryForm: MenuCategoryRequest = blankCategory();
  itemId: number | null = null;
  itemForm: MenuItemRequest = blankItem();

  ngOnInit(): void {
    this.loadAll();
    this.loadMenuQr();
  }

  ngOnDestroy(): void {
    this.clearQrImage();
  }

  // Common menu QR code

  loadMenuQr(): void {
    this.api.menuQr().subscribe({
      next: info => {
        this.menuQr.set(info);
        if (info.generated) {
          this.loadQrImage();
        } else {
          this.clearQrImage();
        }
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'The menu QR code could not be loaded.')),
    });
  }

  generateMenuQr(): void {
    if (this.menuQr()?.generated && !confirm('Regenerate the menu QR code? The printed code will stop working.')) {
      return;
    }
    this.qrBusy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.generateMenuQr().subscribe({
      next: info => {
        this.qrBusy.set(false);
        this.notice.set('Menu QR code generated.');
        this.menuQr.set(info);
        this.loadQrImage();
      },
      error: (e: unknown) => {
        this.qrBusy.set(false);
        this.error.set(errorMessage(e, 'The menu QR code could not be generated.'));
      },
    });
  }

  downloadMenuQr(): void {
    this.qrBusy.set(true);
    this.api.menuQrPng().subscribe({
      next: blob => {
        this.qrBusy.set(false);
        saveBlob(blob, 'menu-qr.png');
      },
      error: (e: unknown) => {
        this.qrBusy.set(false);
        this.error.set(errorMessage(e, 'The menu QR code could not be downloaded.'));
      },
    });
  }

  private loadQrImage(): void {
    this.api.menuQrPng().subscribe({
      next: blob => {
        this.clearQrImage();
        this.qrImage.set(URL.createObjectURL(blob));
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'The menu QR image could not be loaded.')),
    });
  }

  private clearQrImage(): void {
    const url = this.qrImage();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.qrImage.set(null);
  }

  loadAll(): void {
    this.api.categories().subscribe({
      next: categories => this.categories.set(categories),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Categories could not be loaded.')),
    });
    this.loadItems();
  }

  setFilter(categoryId: number | null): void {
    this.filterCategory.set(categoryId);
    this.loadItems();
  }

  // Category management

  editCategory(category: MenuCategory): void {
    this.categoryId = category.id;
    this.categoryForm = { name: category.name, displayPriority: category.displayPriority, enabled: category.enabled };
  }

  resetCategory(): void {
    this.categoryId = null;
    this.categoryForm = blankCategory();
  }

  saveCategory(): void {
    const body: MenuCategoryRequest = { ...this.categoryForm, name: this.categoryForm.name.trim() };
    const id = this.categoryId;
    const request = id === null ? this.api.createCategory(body) : this.api.updateCategory(id, body);
    this.perform(request, id === null ? 'Category added.' : 'Category updated.', () => this.resetCategory());
  }

  removeCategory(category: MenuCategory): void {
    if (!confirm(`Delete the category "${category.name}"? Its dishes are removed too.`)) {
      return;
    }
    this.perform(this.api.deleteCategory(category.id), 'Category deleted.');
  }

  // Dish management

  editItem(item: MenuItem): void {
    this.itemId = item.id;
    this.itemForm = {
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      preparationMinutes: item.preparationMinutes,
      foodType: item.foodType,
      displayPriority: item.displayPriority,
      available: item.available,
      visible: item.visible,
    };
  }

  resetItem(): void {
    this.itemId = null;
    this.itemForm = blankItem();
  }

  saveItem(): void {
    if (!this.itemForm.categoryId) {
      this.error.set('Choose a category for the dish.');
      return;
    }
    const body: MenuItemRequest = {
      ...this.itemForm,
      name: this.itemForm.name.trim(),
      description: (this.itemForm.description ?? '').trim(),
    };
    const id = this.itemId;
    const request = id === null ? this.api.createItem(body) : this.api.updateItem(id, body);
    this.perform(request, id === null ? 'Dish added.' : 'Dish updated.', () => this.resetItem());
  }

  removeItem(item: MenuItem): void {
    if (!confirm(`Delete "${item.name}"?`)) {
      return;
    }
    this.perform(this.api.deleteItem(item.id), 'Dish deleted.');
  }

  toggleAvailable(item: MenuItem): void {
    this.perform(this.api.setAvailability(item.id, !item.available), 'Availability updated.');
  }

  toggleVisible(item: MenuItem): void {
    this.perform(this.api.setVisibility(item.id, !item.visible), 'Visibility updated.');
  }

  uploadImage(item: MenuItem, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.perform(this.api.uploadImage(item.id, file), 'Photo uploaded.');
  }

  private loadItems(): void {
    this.api.items(this.filterCategory() ?? undefined).subscribe({
      next: items => this.items.set(items),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Dishes could not be loaded.')),
    });
  }

  private perform<T>(request: Observable<T>, success: string, onDone?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set(success);
        onDone?.();
        this.loadAll();
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The change could not be saved.'));
      },
    });
  }
}
