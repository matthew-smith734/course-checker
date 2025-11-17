import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseService } from './services/course.service';
import { CourseSearchResult } from './models/course.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  semester: string = '';
  courses: string = '';
  results: CourseSearchResult[] = [];
  isLoading: boolean = false;

  constructor(private courseService: CourseService) {}

  onSubmit(): void {
    if (!this.semester.trim() || !this.courses.trim()) {
      alert('Please enter both semester and courses');
      return;
    }

    this.isLoading = true;
    this.results = [];

    // Clean the input by removing all Unicode whitespace and invisible characters
    // Split by comma first, then aggressively clean each course code
    const courseList = this.courses.split(',')
      .map(c => c
        .replace(/[\s\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '')  // Remove all whitespace and invisible chars
        .replace(/[^A-Za-z0-9]/g, '')  // Keep only alphanumeric
        .toUpperCase()
      )
      .filter(c => c.length > 0);

    console.log('Original input:', this.courses);
    console.log('Cleaned courses:', courseList);

    if (courseList.length === 0) {
      alert('No courses found in input');
      this.isLoading = false;
      return;
    }

    // Search all courses in parallel
    const searchObservables = courseList.map(course => 
      this.courseService.searchCourse(this.semester, course)
    );

    forkJoin(searchObservables).subscribe({
      next: (results) => {
        this.results = results;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error searching courses:', error);
        this.isLoading = false;
        alert('An error occurred while searching courses');
      }
    });
  }

  onReset(): void {
    this.semester = '';
    this.courses = '';
    this.results = [];
  }
}
