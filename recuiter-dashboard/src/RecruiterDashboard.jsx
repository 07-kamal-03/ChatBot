import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const RecruiterDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [jobOpenings, setJobOpenings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const fetchJobOpenings = async () => {
    try {
      const response = await fetch("http://localhost:9000/job-openings/");
      if (!response.ok) {
        throw new Error("Failed to fetch job openings");
      }
      const data = await response.json();

      setJobOpenings(data);
    } catch (error) {
      console.error("Error fetching job openings:", error);
    }
  };

  useEffect(() => {
    fetchJobOpenings();
    fetchApplications();
  }, []);

  const handlePostJob = async () => {
    const newJob = {
      job_id: Date.now(),
      job_title: jobTitle,
      job_description: jobDescription,
      required_skills: requiredSkills,
      years_of_experience: yearsOfExperience,
    };
    try {
      const response = await fetch("http://localhost:9000/job-openings/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newJob),
      });
      if (!response.ok) {
        throw new Error("Failed to post job");
      }
      setJobTitle("");
      setJobDescription("");
      setRequiredSkills("");
      setYearsOfExperience("");
      fetchJobOpenings();
    } catch (error) {
      console.error("Error posting job:", error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      const response = await fetch(
        `http://localhost:9000/job-openings/${jobId}`,
        {
          method: "DELETE",
        }
      );
      console.log(jobId);

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }
      fetchJobOpenings();
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch("http://localhost:8000/applications");
      if (!response.ok) {
        throw new Error("Failed to fetch resumes");
      }
      const data = await response.json();
      console.log(data);

      setApplications(data);
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  const handleViewResume = async (resumeId) => {
    try {
      const metadataResponse = await fetch(
        `http://localhost:8000/applications/${resumeId}`
      );
      console.log(metadataResponse);

      if (!metadataResponse.ok) {
        throw new Error("Failed to fetch resume metadata");
      }
      const metadata = await metadataResponse.json();

      const response = await fetch(
        `http://localhost:8000/applications/${resumeId}/download`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch resume");
      }
      console.log(response);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // a.download = `resume_${resumeId}.pdf`; // Adjust the filename as needed
      a.download = metadata.filename; // Adjust the filename as needed
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Error downloading resume:", error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Recruiter Dashboard
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Post Job" />
          <Tab label="Openings List" />
          <Tab label="Resumes" />
        </Tabs>
      </Box>
      <Box sx={{ p: 3 }}>
        {tabValue === 0 && (
          <Paper elevation={3} sx={{ p: 3, maxWidth: 600, margin: "auto" }}>
            <Typography variant="h6" gutterBottom>
              Post a New Job Opening
            </Typography>
            <TextField
              label="Job Title"
              fullWidth
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Job Description"
              fullWidth
              multiline
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Required Skills"
              fullWidth
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Years of Experience"
              fullWidth
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button variant="contained" onClick={handlePostJob}>
              Post Job
            </Button>
          </Paper>
        )}
        {tabValue === 1 && (
          <Paper elevation={3} sx={{ p: 3, maxWidth: 800, margin: "auto" }}>
            <Typography variant="h6" gutterBottom>
              Job Openings List
            </Typography>
            <List>
              {jobOpenings.map((job) => (
                <ListItem
                  key={job.job_id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteJob(job.job_id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={job.job_title}
                    secondary={
                      <>
                        <Typography variant="body2">
                          {job.job_description}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Skills:</strong> {job.required_skills}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Experience:</strong> {job.years_of_experience}{" "}
                          years
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
        {tabValue === 2 && (
          <Paper elevation={3} sx={{ p: 3, maxWidth: 800, margin: "auto" }}>
            <Typography variant="h6" gutterBottom>
              Resumes Submitted
            </Typography>
            <TableContainer
              component={Paper}
              sx={{ maxWidth: 800, margin: "auto", mt: 3 }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Job Title</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Resume Name</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Download Link</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.job_title}</TableCell>
                      <TableCell>{app.filename}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => handleViewResume(app.id)}
                        >
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default RecruiterDashboard;
