import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CourseSearchResult, CourseSection } from '../models/course.model';
import { isDevMode } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  // Always go through /api; environment controls where /api is routed (dev proxy, nginx, or cache proxy)
  // All HTTP calls go through the /api prefix so the cache proxy or dev server can handle routing.
  private readonly API_BASE = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('CourseService initialized. API_BASE:', this.API_BASE, 'DevMode:', isDevMode());
  }

  /**
   * Fire the title search, then if we find a match, fetch the full enrollment details.
   */
  searchCourse(semester: string, courseCode: string): Observable<CourseSearchResult> {
    // Sanitize input to remove any invisible Unicode characters
    // Normalize user input down to alphanumeric uppercase text so backend requests stay predictable.
    const cleanCourseCode = courseCode.replace(/[\s\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '').toUpperCase();
    
    if (cleanCourseCode.length < 4) {
      return of({
        found: false,
        courseName: cleanCourseCode,
        error: 'Invalid course format'
      });
    }

    const code = cleanCourseCode.substring(0, 4);
    const sanitizedCode = code.replace(/1$/, '');
    const title = cleanCourseCode.substring(4);

    // First API call to check if course exists
    // Query the optimized title endpoint to determine if the requested pre-existing course exists.
    const searchUrl = `${this.API_BASE}/getOptimizedMatchingCourseTitles?term=${sanitizedCode}&divisions=ARTSC&sessions=${semester}&lowerThreshold=50&upperThreshold=200`;

    return this.http.get(searchUrl, { responseType: 'text' }).pipe(
      switchMap(response => {
        if (response.includes(title)) {
          // Course found, get details - use cleaned full course code
          return this.getCourseDetails(cleanCourseCode, cleanCourseCode, semester);
        } else {
          return of({
            found: false,
            courseName: cleanCourseCode,
            error: 'Course not found'
          });
        }
      }),
      catchError(error => {
        console.error('Error searching course:', cleanCourseCode, error.status, error.message);
        return of({
          found: false,
          courseName: cleanCourseCode,
          error: `Error searching course: ${error.status || error.message || 'Unknown error'}`
        });
      })
    );
  }

  /**
   * POST the fully-qualified course code to the pageable endpoint to read all sections.
   */
  private getCourseDetails(fullCourseCode: string, courseCode: string, semester: string): Observable<CourseSearchResult> {
    const detailsUrl = `${this.API_BASE}/getPageableCourses`;
    
    // Use full course code (e.g. GGR348H1) not sanitized (GGR3)
    // Compose the JSON payload the backend expects for /getPageableCourses.
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

  /**
   * Pull each <sections> entry from the XML payload so the UI can render the enrollment bars.
   */
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
                // Extract meeting times
                const meetingTimes = this.extractMeetingTimes(sectionElement);
                
                const section = {
                  name: nameElement.textContent || '',
                  currentEnrolment: parseInt(currentEnrolmentElement.textContent || '0'),
                  maxEnrolment: parseInt(maxEnrolmentElement.textContent || '0'),
                  meetingTimes: meetingTimes
                };
                
                console.log('Section with meeting times:', section);
                sections.push(section);
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

  /**
   * Extract meeting times (day, time, room) from a section element
   */
  private extractMeetingTimes(sectionElement: Element): any[] {
    const meetingTimes: any[] = [];
    
    try {
      // Find the <meetingTimes> container
      let meetingTimesContainer = null;
      for (let i = 0; i < sectionElement.children.length; i++) {
        if (sectionElement.children[i].tagName === 'meetingTimes') {
          meetingTimesContainer = sectionElement.children[i];
          break;
        }
      }
      
      if (meetingTimesContainer) {
        // Each <meetingTimes> child element represents one meeting time
        for (let j = 0; j < meetingTimesContainer.children.length; j++) {
          const meetingTimeElement = meetingTimesContainer.children[j];
          
          if (meetingTimeElement.tagName === 'meetingTimes') {
            // Get start and end elements
            const startElement = meetingTimeElement.getElementsByTagName('start')[0];
            const endElement = meetingTimeElement.getElementsByTagName('end')[0];
            const buildingElement = meetingTimeElement.getElementsByTagName('building')[0];
            
            if (startElement && endElement) {
              // Extract day number and milliseconds
              const dayNumElement = startElement.getElementsByTagName('day')[0];
              const startMillisElement = startElement.getElementsByTagName('millisofday')[0];
              const endMillisElement = endElement.getElementsByTagName('millisofday')[0];
              
              if (dayNumElement && startMillisElement && endMillisElement) {
                const dayNum = parseInt(dayNumElement.textContent || '0');
                const startMillis = parseInt(startMillisElement.textContent || '0');
                const endMillis = parseInt(endMillisElement.textContent || '0');
                
                // Get room info
                let room = '';
                if (buildingElement) {
                  const buildingCode = buildingElement.getElementsByTagName('buildingCode')[0]?.textContent || '';
                  const roomNumber = buildingElement.getElementsByTagName('buildingRoomNumber')[0]?.textContent || '';
                  if (buildingCode) {
                    room = roomNumber ? `${buildingCode} ${roomNumber}`.trim() : buildingCode;
                  }
                }
                
                const meetingTime = {
                  day: this.convertDayNumber(dayNum),
                  startTime: this.convertMillisToTime(startMillis),
                  endTime: this.convertMillisToTime(endMillis),
                  room: room
                };
                
                console.log('Extracted meeting time:', meetingTime);
                meetingTimes.push(meetingTime);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing meeting times:', error);
    }
    
    return meetingTimes;
  }

  /**
   * Convert day number to day abbreviation
   */
  private convertDayNumber(dayNum: number): string {
    const days = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    return days[dayNum] || '';
  }

  /**
   * Convert milliseconds of day to HH:MM format
   */
  private convertMillisToTime(millis: number): string {
    const hours = Math.floor(millis / 3600000);
    const minutes = Math.floor((millis % 3600000) / 60000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
