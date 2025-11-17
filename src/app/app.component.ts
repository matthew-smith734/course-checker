import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseService, CourseResult } from './course.service';
import { XmlParserService } from './xml-parser.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Course Checker';
  semester: string = '';
  courses: string = '';
  results: string = '';
  isProcessing: boolean = false;

  constructor(
    private courseService: CourseService,
    private xmlParser: XmlParserService
  ) {}

  /**
   * Process courses - mirrors Java's processCourses method
   */
  async processCourses(): Promise<void> {
    if (!this.courses || this.courses.trim() === '') {
      alert('No courses found in input');
      return;
    }

    this.isProcessing = true;
    this.results = '';

    const courseList = this.courses.split(',').map(c => c.trim()).filter(c => c);
    
    if (courseList.length === 0) {
      alert('No courses found in input');
      this.isProcessing = false;
      return;
    }

    // Group courses by their first 4 characters (course code)
    const codeMap = new Map<string, string[]>();
    for (const course of courseList) {
      if (course.length >= 4) {
        const code = course.substring(0, 4);
        if (!codeMap.has(code)) {
          codeMap.set(code, []);
        }
        codeMap.get(code)!.push(course);
      } else {
        this.results += `Invalid course format: ${course}\n`;
      }
    }

    // Search for each course code
    const searchResults = new Map<string, string>();
    for (const code of codeMap.keys()) {
      const sanitizedCode = code.replace(/1$/, '');
      try {
        const response = await this.courseService.searchCourseTitles(code, this.semester).toPromise();
        searchResults.set(code, response || '');
      } catch (error) {
        console.error(`Error searching for ${code}:`, error);
      }
    }

    // Process each course
    for (const course of courseList) {
      if (course.length >= 4) {
        const code = course.substring(0, 4);
        const sanitizedCode = code.replace(/1$/, '');
        const title = course.substring(4);
        const searchResult = searchResults.get(code) || '';

        if (this.xmlParser.courseExistsInSearch(searchResult, title)) {
          this.results += `Found ${course}\n`;
          
          try {
            const detailsResponse = await this.courseService.getPageableCourses(sanitizedCode, course, this.semester).toPromise();
            if (detailsResponse) {
              const sections = await this.xmlParser.extractSectionsFromXml(detailsResponse);
              
              sections.forEach(section => {
                this.results += `Section Name: ${section.name}\n`;
                this.results += `Current Enrolment: ${section.currentEnrolment}\n`;
                this.results += `Max Enrolment: ${section.maxEnrolment}\n`;
                this.results += '\n';
              });
              
              this.results += '-------------------------------------\n';
            }
          } catch (error) {
            console.error(`Error getting details for ${course}:`, error);
          }
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Reset form - mirrors Java's reset button
   */
  reset(): void {
    this.semester = '';
    this.courses = '';
    this.results = '';
  }
}
