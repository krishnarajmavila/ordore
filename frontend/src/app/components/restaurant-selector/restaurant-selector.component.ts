import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Restaurant } from '../../models/restaurant.model';
import { RestaurantService } from '../../services/restaurant.service';

@Component({
  selector: 'app-restaurant-selector',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './restaurant-selector.component.html',
  styleUrls: ['./restaurant-selector.component.scss']
})
export class RestaurantSelectorComponent implements OnInit {
  @Output() restaurantChange = new EventEmitter<Restaurant>();
  
  restaurants: Restaurant[] = [];
  selectedRestaurant: Restaurant | null = null;

  constructor(private restaurantService: RestaurantService) {}

  ngOnInit() {
    this.loadRestaurants();
  }

  loadRestaurants() {
    this.restaurantService.getAllRestaurants().subscribe({
      next: (restaurants) => {
        this.restaurants = restaurants;
        if (restaurants.length > 0) {
          this.selectedRestaurant = restaurants[0];
          this.onSelectionChange();
        }
      },
      error: (error) => console.error('Error loading restaurants:', error)
    });
  }

  onSelectionChange() {
    if (this.selectedRestaurant) {
      this.restaurantChange.emit(this.selectedRestaurant);
    }
  }
}