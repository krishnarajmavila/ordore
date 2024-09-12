import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cartFilter',
  standalone: true
})
export class CartFilterPipe implements PipeTransform {
  transform(cartItems: any[], item: any): any {
    return cartItems.filter(cartItem => cartItem.item._id === item._id);
  }
}