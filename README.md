# UofT Course Checker

A tool for checking University of Toronto course availability and enrollment information. Available in multiple formats: Java desktop application, web application, and command-line scripts.

## Overview

UofT Course Checker helps students monitor course enrollment status by fetching real-time data from the University of Toronto's course API. The tool can check multiple courses at once and display current vs. maximum enrollment for each section.

## Features

- **Real-time Course Data**: Fetches current enrollment information from UofT's official API
- **Multiple Interfaces**: Choose between GUI, web, or command-line interface
- **Batch Checking**: Monitor multiple courses simultaneously
- **Section Details**: View enrollment data for all sections of a course
- **Cross-platform**: Java application works on Windows, macOS, and Linux

## Available Versions

### 1. Java Desktop Application

A Swing-based GUI application that can also run in headless mode for command-line use.

**Features:**
- Graphical user interface for easy interaction
- Headless mode for automation
- Packaged as executable JAR file
- Windows executable (.exe) available

### 2. Angular Web Application

A modern web interface hosted on Cloudflare Pages.

**Features:**
- Responsive design for desktop and mobile
- Real-time course search
- Visual enrollment indicators
- No installation required

See [angular-app/README.md](angular-app/README.md) for detailed setup and deployment instructions.

### 3. Shell Scripts

Command-line scripts for quick checks.

**Available:**
- `check.sh` - Bash script for Unix/Linux/macOS
- `check.bat` - Batch script for Windows

## Quick Start

### Using the Java Application

#### Prerequisites
- Java 17 or higher

#### Running the Application

**GUI Mode (default):**
```bash
java -jar CourseChecker.jar
```

**Note:** The application automatically detects if a graphical environment is available. In headless environments (e.g., SSH sessions, servers), it will automatically switch to command-line mode with interactive prompts for semester and course input.

#### Using the Pre-built Executable (Windows)
```cmd
CourseChecker.exe
```

### Using the Shell Scripts

#### Prerequisites
- `curl` command-line tool
- Create a `tocheck.txt` file with course codes (space-separated)

#### Running the Scripts

**Linux/macOS:**
```bash
./check.sh 20251
```

**Windows:**
```cmd
check.bat 20251
```

Replace `20251` with your desired semester code.

### Using the Web Application

Visit the deployed Angular application or see [angular-app/README.md](angular-app/README.md) to run it locally.

## Semester Format

Semesters are specified using a 5-digit code: `YYYYM`

- `20251` - Winter 2025
- `20255` - Summer 2025
- `20259` - Fall 2025

## Course Code Format

Courses should be specified with their full code, including the title portion:

Examples:
- `CSC108H1` - Introduction to Computer Programming
- `MAT137Y1` - Calculus! (note: the exclamation mark is part of the official course name)
- `PHY151H1` - Foundations of Physics I

For the Java application and scripts, you can provide multiple courses:
- Comma-separated: `CSC108H1,MAT137Y1,PHY151H1`
- Space-separated (in tocheck.txt): `CSC108H1 MAT137Y1 PHY151H1`

## Building from Source

### Java Application

#### Prerequisites
- Java Development Kit (JDK) 17 or higher
- javac compiler

#### Compile
```bash
javac CourseChecker.java
```

#### Create JAR
```bash
jar cfm CourseChecker.jar manifest.txt CourseChecker.class
```

#### Create Windows Executable
The repository includes Launch4j configuration (`Config.xml`) for creating a Windows .exe file from the JAR.

### Angular Application

See [angular-app/README.md](angular-app/README.md) for build instructions.

## Project Structure

```
course-checker/
├── CourseChecker.java          # Main Java source file
├── CourseChecker.jar           # Compiled Java application
├── CourseChecker.exe           # Windows executable
├── check.sh                    # Bash script for course checking
├── check.bat                   # Windows batch script
├── Config.xml                  # Launch4j configuration
├── manifest.txt                # JAR manifest file
├── angular-app/                # Angular web application
│   ├── src/                    # Angular source code
│   ├── package.json            # Node.js dependencies
│   └── README.md               # Angular app documentation
└── README.md                   # This file
```

## API Information

This tool uses the University of Toronto's EASI (Enterprise Academic System Integration) API:
- Base URL: `https://api.easi.utoronto.ca/ttb/`
- Endpoints used:
  - `https://api.easi.utoronto.ca/ttb/getOptimizedMatchingCourseTitles` - Search for courses
  - `https://api.easi.utoronto.ca/ttb/getPageableCourses` - Get detailed course information

## Output

The application displays:
- Course availability confirmation
- Section names (LEC, TUT, PRA)
- Current enrollment numbers
- Maximum enrollment capacity
- Enrollment status for each section

Example output:
```
Found CSC108H1
Section Name: LEC0101
Current Enrolment: 245
Max Enrolment: 300

Section Name: TUT0101
Current Enrolment: 25
Max Enrolment: 30
-------------------------------------
```

## Limitations

- Only searches courses in the Faculty of Arts & Science (ARTSC division)
- Requires active internet connection
- API availability depends on UofT's service status

## Troubleshooting

### Java Application Issues

**"Java not found" error:**
- Ensure Java 17 or higher is installed
- Verify `java` is in your system PATH

**GUI doesn't appear:**
- Your system might be in headless mode
- The application will automatically fall back to command-line mode

### Script Issues

**"curl: command not found":**
- Install curl: `sudo apt-get install curl` (Linux) or `brew install curl` (macOS)

**No results returned:**
- Check your internet connection
- Verify the semester code is correct
- Ensure course codes are properly formatted

### Web Application Issues

See [angular-app/README.md](angular-app/README.md) for troubleshooting the Angular application.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is provided as-is for educational purposes.

## Acknowledgments

- University of Toronto for providing the course API
- Built for UofT students to help with course enrollment planning

## Contact

For questions or issues, please open an issue on GitHub.
