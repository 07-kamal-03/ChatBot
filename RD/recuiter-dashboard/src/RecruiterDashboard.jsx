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
  Badge,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Popover from "@mui/material/Popover";

const RecruiterDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [jobOpenings, setJobOpenings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [newApplications, setNewApplications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [seenApplications, setSeenApplications] = useState(new Set());

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
      const seenApps = new Set(
        JSON.parse(localStorage.getItem("seenApplications") || "[]")
      );

      const newApps = data.filter((app) => !seenApps.has(app.id));
      setApplications(data);
      setNewApplications(newApps);
      setSeenApplications(seenApps);
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setAnchorEl(null);
    const updatedSeenApps = new Set([
      ...seenApplications,
      ...newApplications.map((app) => app.id),
    ]);

    localStorage.setItem(
      "seenApplications",
      JSON.stringify([...updatedSeenApps])
    );

    setSeenApplications(updatedSeenApps);
    setNewApplications([]);
  };

  const open = Boolean(anchorEl);
  const id = open ? "notification-popover" : undefined;

  const handleViewResume = async (resumeId) => {
    try {
      const metadataResponse = await fetch(
        `http://localhost:8000/applications/${resumeId}`
      );
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

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = metadata.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Error downloading resume:", error);
    }
  };

  const handleDeleteApplications = async (app_id) => {
    try {
      const response = await fetch(
        `http://localhost:8000/applications/delete/${app_id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete applications");
      }
      fetchApplications();
    } catch (error) {
      console.error("Error deleting applications:", error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Recruiter Dashboard
          </Typography>
          <IconButton color="inherit" onClick={handleNotificationClick}>
            <Badge badgeContent={newApplications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handleNotificationClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Paper sx={{ p: 2, minWidth: 250 }}>
              <Typography variant="h6">New Applications</Typography>
              {newApplications.length > 0 ? (
                <List>
                  {newApplications.map((app) => (
                    <ListItem key={app.id}>
                      <ListItemText
                        primary={app.filename}
                        secondary={app.job_title}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography>No new applications</Typography>
              )}
            </Paper>
          </Popover>
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
          <Paper elevation={3} sx={{ p: 3, maxWidth: 900, margin: "auto" }}>
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
                    <TableCell>
                      <strong>Delete</strong>
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
                      <TableCell>
                        <Button
                          variant="contained"
                          color="secondary"
                          style={{ backgroundColor: "#FF0000" }}
                          onClick={() => handleDeleteApplications(app.id)}
                        >
                          Delete
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
