package com.taskflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Boots the whole application (Spring Security + JPA + H2) and exercises the
 * endpoints the existing frontend depends on, asserting the exact JSON shapes
 * ({@code _id}, {@code isActive}, {@code isRead}, {@code dependsOn}, pagination...).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TaskflowApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void fullApplicationFlow() throws Exception {
        // ── register ─────────────────────────────────────────────────────────
        String registerBody = """
                {"name":"Ada Lovelace","email":"ada@example.com","password":"secret123"}
                """;
        JsonNode register = json(mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(registerBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Registration successful"))
                .andExpect(jsonPath("$.data.user._id").exists())
                .andExpect(jsonPath("$.data.user.email").value("ada@example.com"))
                .andExpect(jsonPath("$.data.user.isActive").value(true))
                .andExpect(jsonPath("$.data.user.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn());

        String token = register.path("data").path("accessToken").asText();
        String refreshToken = register.path("data").path("refreshToken").asText();
        String userId = register.path("data").path("user").path("_id").asText();

        // ── login ────────────────────────────────────────────────────────────
        JsonNode login = json(mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ada@example.com\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andReturn());
        assertThat(login.path("data").path("accessToken").asText()).isNotEmpty();

        // ── login with a wrong password returns the original error code ──────
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ada@example.com\",\"password\":\"nope\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));

        // ── token refresh ────────────────────────────────────────────────────
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Token refreshed successfully"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());

        // ── protected endpoint without a token ───────────────────────────────
        mockMvc.perform(get("/api/v1/tasks"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("NO_TOKEN"));

        // ── profile ──────────────────────────────────────────────────────────
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Profile retrieved successfully"))
                .andExpect(jsonPath("$.data.user._id").value(userId));

        // ── projects ─────────────────────────────────────────────────────────
        mockMvc.perform(post("/api/v1/projects")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Website Redesign\",\"description\":\"Redesign\",\"status\":\"ACTIVE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.project._id").exists())
                .andExpect(jsonPath("$.data.project.status").value("ACTIVE"));

        mockMvc.perform(get("/api/v1/projects").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("Website Redesign"))
                .andExpect(jsonPath("$.data[0].taskStats.total").value(0))
                .andExpect(jsonPath("$.data[0].health.label").value("No Tasks"))
                .andExpect(jsonPath("$.pagination.page").value(1))
                .andExpect(jsonPath("$.pagination.limit").value(10));

        JsonNode createdProject = json(mockMvc.perform(get("/api/v1/projects").header("Authorization", bearer(token)))
                .andReturn());
        String projectId = createdProject.path("data").get(0).path("_id").asText();

        // ── create task ──────────────────────────────────────────────────────
        String taskBody = """
                {"title":"Implement API","description":"Build the REST API","priority":"HIGH",
                 "project":"%s","dueDate":"2026-12-31","labels":["backend","api"]}
                """.formatted(projectId);
        JsonNode createdTask = json(mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(taskBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Task created successfully"))
                .andExpect(jsonPath("$.data.task._id").exists())
                .andExpect(jsonPath("$.data.task.status").value("TODO"))
                .andExpect(jsonPath("$.data.task.priority").value("HIGH"))
                .andExpect(jsonPath("$.data.task.dependsOn").isArray())
                .andExpect(jsonPath("$.data.task.recurrence.frequency").value("none"))
                .andExpect(jsonPath("$.data.task.createdBy._id").value(userId))
                .andExpect(jsonPath("$.data.task.project._id").value(projectId))
                .andExpect(jsonPath("$.data.task.labels[0]").value("backend"))
                .andReturn());
        String taskId = createdTask.path("data").path("task").path("_id").asText();

        // ── invalid status is rejected with 422 VALIDATION_ERROR ─────────────
        mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Bad\",\"status\":\"NOPE\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        // ── list tasks ───────────────────────────────────────────────────────
        mockMvc.perform(get("/api/v1/tasks").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Implement API"))
                .andExpect(jsonPath("$.pagination.total").value(1));

        // ── filters / search / sort used by tasks.html ───────────────────────
        mockMvc.perform(get("/api/v1/tasks").param("search", "Implement").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.total").value(1));
        mockMvc.perform(get("/api/v1/tasks").param("status", "TODO,COMPLETED")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.total").value(1));
        mockMvc.perform(get("/api/v1/tasks").param("priority", "HIGH").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.total").value(1));
        mockMvc.perform(get("/api/v1/tasks").param("label", "backend").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.total").value(1));
        mockMvc.perform(get("/api/v1/tasks").param("category", "nope").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.total").value(0));
        mockMvc.perform(get("/api/v1/tasks").param("overdue", "true").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.total").value(0));
        mockMvc.perform(get("/api/v1/tasks").param("sortBy", "dueDate").param("sortOrder", "asc")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        // ── profile update + password change ─────────────────────────────────
        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ada L\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.name").value("Ada L"));
        mockMvc.perform(put("/api/v1/users/me").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("NO_UPDATES"));

        // ── update task (explicit null clears the assignee) ──────────────────
        mockMvc.perform(put("/api/v1/tasks/" + taskId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Implement API v2\",\"assignedTo\":null,\"category\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.title").value("Implement API v2"))
                .andExpect(jsonPath("$.data.task.assignedTo").doesNotExist());

        // ── status change ────────────────────────────────────────────────────
        mockMvc.perform(patch("/api/v1/tasks/" + taskId + "/status")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.task.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.task.completedAt").exists());

        // ── dashboard stats ──────────────────────────────────────────────────
        mockMvc.perform(get("/api/v1/tasks/dashboard/stats").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stats.totalTasks").value(1))
                .andExpect(jsonPath("$.data.stats.completedTasks").value(1))
                .andExpect(jsonPath("$.data.stats.statusBreakdown.COMPLETED").value(1))
                .andExpect(jsonPath("$.data.stats.priorityBreakdown.HIGH").value(1))
                .andExpect(jsonPath("$.data.stats.productivityScore").value(100))
                .andExpect(jsonPath("$.data.stats.weeklyCompleted").isArray())
                .andExpect(jsonPath("$.data.stats.monthlyCompleted").isArray());

        // ── kanban board ─────────────────────────────────────────────────────
        mockMvc.perform(get("/api/v1/tasks/kanban").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.TODO").isArray())
                .andExpect(jsonPath("$.data.IN_PROGRESS").isArray())
                .andExpect(jsonPath("$.data.REVIEW").isArray())
                .andExpect(jsonPath("$.data.COMPLETED.length()").value(1));

        // ── calendar ─────────────────────────────────────────────────────────
        mockMvc.perform(get("/api/v1/tasks/calendar")
                        .param("dateFrom", "2026-12-01T00:00:00.000Z")
                        .param("dateTo", "2026-12-31T23:59:59.000Z")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Implement API v2"));

        // ── subtasks ─────────────────────────────────────────────────────────
        mockMvc.perform(post("/api/v1/tasks/" + taskId + "/subtasks")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Write tests\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.subtask.title").value("Write tests"));

        mockMvc.perform(get("/api/v1/tasks/" + taskId + "/subtasks").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].completed").value(false))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.completed").value(0))
                .andExpect(jsonPath("$.percentage").value(0));

        // ── comments ─────────────────────────────────────────────────────────
        mockMvc.perform(post("/api/v1/tasks/" + taskId + "/comments")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Looks good\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.comment._id").exists());

        mockMvc.perform(get("/api/v1/tasks/" + taskId + "/comments").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.comments[0].content").value("Looks good"));

        // ── notifications (unreadCount + isRead naming) ──────────────────────
        mockMvc.perform(get("/api/v1/notifications").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").exists())
                .andExpect(jsonPath("$.pagination.total").exists());

        mockMvc.perform(patch("/api/v1/notifications/read-all").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.modifiedCount").exists());

        // ── admin endpoints are role protected ───────────────────────────────
        mockMvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ADMIN_REQUIRED"));

        // ── health ───────────────────────────────────────────────────────────
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
        mockMvc.perform(get("/api/v1/ready"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.database").value("connected"));

        // ── teams ────────────────────────────────────────────────────────────
        mockMvc.perform(post("/api/v1/teams")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Engineering\",\"description\":\"Eng team\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.team.members[0].role").value("OWNER"));

        // ── delete task ──────────────────────────────────────────────────────
        mockMvc.perform(delete("/api/v1/tasks/" + taskId).header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());

        mockMvc.perform(get("/api/v1/tasks").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.total").value(0));
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
