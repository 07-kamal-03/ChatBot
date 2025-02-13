import React, { useState } from "react";
import { User, Briefcase, Filter } from "lucide-react";
import "./RecruiterDashboard.css";

const jobs = [
  { id: 1, title: "Frontend Developer", applicants: 12 },
  { id: 2, title: "Backend Developer", applicants: 8 },
  { id: 3, title: "UI/UX Designer", applicants: 5 },
];

const applicants = [
  { id: 1, name: "John Doe", job: "Frontend Developer", status: "Pending" },
  { id: 2, name: "Jane Smith", job: "Backend Developer", status: "Reviewed" },
  { id: 3, name: "Alice Brown", job: "UI/UX Designer", status: "Interview" },
];

export default function RecruiterDashboard() {
  const [filter, setFilter] = useState("");
  const [newJob, setNewJob] = useState({ title: "", description: "", skills: "" });

  const handleJobPost = () => {
    if (newJob.title && newJob.description && newJob.skills) {
      console.log("New Job Posted:", newJob);
      setNewJob({ title: "", description: "", skills: "" });
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Recruiter Dashboard</h1>

      <div className="job-list">
        {jobs.map((job) => (
          <div key={job.id} className="job-card">
            <div className="job-content">
              <h2 className="job-title">{job.title}</h2>
              <p className="job-applicants">{job.applicants} Applicants</p>
            </div>
            <Briefcase size={24} />
          </div>
        ))}
      </div>

      <div className="job-form">
        <h2 className="form-title">Post a New Job</h2>
        <input
          type="text"
          placeholder="Job Title"
          value={newJob.title}
          onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Job Description"
          value={newJob.description}
          onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Required Skills"
          value={newJob.skills}
          onChange={(e) => setNewJob({ ...newJob, skills: e.target.value })}
          className="input-field"
        />
        <button className="post-button" onClick={handleJobPost}>
          Post Job
        </button>
      </div>

      <div className="filter-section">
        <input type="text" placeholder="Search applicants..." className="search-input" />
        <select className="filter-dropdown" onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="Pending">Pending</option>
          <option value="Reviewed">Reviewed</option>
          <option value="Interview">Interview</option>
        </select>
        <button className="filter-button">
          <Filter size={18} className="filter-icon" /> Filter
        </button>
      </div>

      <table className="applicant-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Job Title</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {applicants
            .filter((app) => (filter !== "all" && filter ? app.status === filter : true))
            .map((app) => (
              <tr key={app.id}>
                <td className="applicant-name">
                  <User size={18} className="user-icon" /> {app.name}
                </td>
                <td>{app.job}</td>
                <td>{app.status}</td>
                <td>
                  <button className="view-button">View</button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
