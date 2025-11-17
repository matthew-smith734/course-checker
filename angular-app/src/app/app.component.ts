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

    const courseList = this.courses.split(',').map(c => c.trim()).filter(c => c.length > 0);

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
