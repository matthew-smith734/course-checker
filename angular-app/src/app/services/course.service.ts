import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CourseSearchResult, CourseSection } from '../models/course.model';
import { isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  // Use standalone proxy server in development, Cloudflare Worker in production
  private readonly API_BASE = isDevMode() 
    ? 'http://localhost:3000/ttb'  // Standalone Node.js proxy server
    : '/api';  // Cloudflare Worker proxy

  constructor(private http: HttpClient) {
    console.log('CourseService initialized. API_BASE:', this.API_BASE, 'DevMode:', isDevMode());
  }

  searchCourse(semester: string, courseCode: string): Observable<CourseSearchResult> {
    if (courseCode.length < 4) {
      return of({
        found: false,
        courseName: courseCode,
        error: 'Invalid course format'
      });
    }

    const code = courseCode.substring(0, 4);
    const sanitizedCode = code.replace(/1$/, '');
    const title = courseCode.substring(4);

    // First API call to check if course exists
    const searchUrl = `${this.API_BASE}/getOptimizedMatchingCourseTitles?term=${sanitizedCode}&divisions=ARTSC&sessions=${semester}&lowerThreshold=50&upperThreshold=200`;

    return this.http.get(searchUrl, { responseType: 'text' }).pipe(
      switchMap(response => {
        if (response.includes(title)) {
          // Course found, get details - use FULL course code, not sanitized
          return this.getCourseDetails(courseCode, courseCode, semester);
        } else {
          return of({
            found: false,
            courseName: courseCode,
            error: 'Course not found'
          });
        }
      }),
      catchError(error => {
        console.error('Error searching course:', courseCode, error.status, error.message);
        return of({
          found: false,
          courseName: courseCode,
          error: `Error searching course: ${error.status || error.message || 'Unknown error'}`
        });
      })
    );
  }

  private getCourseDetails(fullCourseCode: string, courseCode: string, semester: string): Observable<CourseSearchResult> {
    const detailsUrl = `${this.API_BASE}/getPageableCourses`;
    
    // Use full course code (e.g. GGR348H1) not sanitized (GGR3)
    const postData = {
      courseCodeAndTitleProps: {
        courseCode: fullCourseCode,  // Use full course code!
        courseTitle: '',
        courseSectionCode: '',
        searchCourseDescription: false  // Try with false
      },
      departmentProps: [],
      campuses: [],
      sessions: [semester],
      requirementProps: [],
      instructor: '',
      courseLevels: [],
      deliveryModes: [],
      dayPreferences: [],
      timePreferences: [],
      divisions: ['ARTSC'],
      creditWeights: [],
      availableSpace: false,
      waitListable: false,
      page: 1,
      pageSize: 20,
      direction: 'asc'
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': '*/*'
    });

    return this.http.post(detailsUrl, postData, { headers, responseType: 'text' }).pipe(
      map(response => {
        if (!response || response.length === 0) {
          throw new Error('Empty response from API');
        }
        
        // Clean up the response - remove leading non-word characters before the XML
        // This matches what the Java version does: newResponse.trim().replaceFirst("^([\\W]+)<","<");
        const cleanedResponse = response.trim().replace(/^[\W]+</, '<');
        
        if (!cleanedResponse.startsWith('<')) {
          throw new Error('Invalid response format - not XML');
        }
        
        const sections = this.extractSections(cleanedResponse);
        return {
          found: true,
          courseName: courseCode,
          sections: sections
        };
      }),
      catchError(error => {
        console.error('Error getting course details:', courseCode, error.message);
        return of({
          found: false,
          courseName: courseCode,
          error: `Error getting course details: ${error.status || error.message || 'Unknown error'}`
        });
      })
    );
  }

  private extractSections(xmlResponse: string): CourseSection[] {
    const sections: CourseSection[] = [];
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
      
      // Navigate to payload > pageableCourse > courses > sections
      const payloadElement = xmlDoc.getElementsByTagName('payload')[0];
      if (!payloadElement) return sections;
      
      const pageableCourseElement = payloadElement.getElementsByTagName('pageableCourse')[0];
      if (!pageableCourseElement) return sections;
      
      const coursesElements = pageableCourseElement.getElementsByTagName('courses');
      
      for (let i = 0; i < coursesElements.length; i++) {
        const courseElement = coursesElements[i];
        
        // Get the <sections> container - it's a direct child of <courses>
        let sectionsContainer = null;
        for (let k = 0; k < courseElement.children.length; k++) {
          if (courseElement.children[k].tagName === 'sections') {
            sectionsContainer = courseElement.children[k];
            break;
          }
        }
        
        if (sectionsContainer) {
          // Get direct children <sections> elements (the actual section items)
          for (let j = 0; j < sectionsContainer.children.length; j++) {
            const sectionElement = sectionsContainer.children[j];
            
            if (sectionElement.tagName === 'sections') {
              const nameElement = sectionElement.getElementsByTagName('name')[0];
              const currentEnrolmentElement = sectionElement.getElementsByTagName('currentEnrolment')[0];
              const maxEnrolmentElement = sectionElement.getElementsByTagName('maxEnrolment')[0];
              
              if (nameElement && currentEnrolmentElement && maxEnrolmentElement) {
                sections.push({
                  name: nameElement.textContent || '',
                  currentEnrolment: parseInt(currentEnrolmentElement.textContent || '0'),
                  maxEnrolment: parseInt(maxEnrolmentElement.textContent || '0')
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing XML:', error);
    }
    
    // Sort sections alphabetically by name
    sections.sort((a, b) => a.name.localeCompare(b.name));
    
    return sections;
  }
}
