package com.taskflow.config;

import com.taskflow.entity.Project;
import com.taskflow.entity.Task;
import com.taskflow.entity.Team;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.MemberRole;
import com.taskflow.entity.enums.ProjectStatus;
import com.taskflow.entity.enums.Role;
import com.taskflow.entity.enums.TaskPriority;
import com.taskflow.entity.enums.TaskStatus;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.TeamRepository;
import com.taskflow.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Recreates the original {@code npm run seed} demo dataset.
 * Disabled by default — enable with {@code APP_SEED_ENABLED=true}.
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final TaskRepository taskRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, ProjectRepository projectRepository,
                      TeamRepository teamRepository, TaskRepository taskRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.teamRepository = teamRepository;
        this.taskRepository = taskRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("[DataSeeder] Users already exist — skipping seed.");
            return;
        }

        User admin = createUser("Admin User", "admin@taskflow.com", "admin123", Role.ADMIN);
        User manager = createUser("Manager User", "manager@taskflow.com", "manager123", Role.MANAGER);
        User john = createUser("John Developer", "john@taskflow.com", "john123", Role.USER);
        User jane = createUser("Jane Designer", "jane@taskflow.com", "jane123", Role.USER);

        Project websiteRedesign = createProject("Website Redesign", "Complete website redesign project",
                manager, ProjectStatus.ACTIVE, List.of(manager, john, jane));
        Project mobileApp = createProject("Mobile App", "Build mobile application",
                admin, ProjectStatus.PLANNED, List.of(admin, john));

        createTask("Design landing page", "Create wireframes and mockups", TaskStatus.COMPLETED,
                TaskPriority.HIGH, manager, jane, websiteRedesign, LocalDateTime.now());
        createTask("Implement API endpoints", "Build REST API for tasks module", TaskStatus.IN_PROGRESS,
                TaskPriority.HIGH, manager, john, websiteRedesign, null);
        createTask("Write unit tests", "Cover all API endpoints with tests", TaskStatus.TODO,
                TaskPriority.MEDIUM, john, john, websiteRedesign, null);
        createTask("Setup Docker", "Create Dockerfile and docker-compose.yml", TaskStatus.COMPLETED,
                TaskPriority.URGENT, admin, john, websiteRedesign, LocalDateTime.now());
        createTask("Design database schema", "Design relational schema", TaskStatus.TODO,
                TaskPriority.HIGH, admin, john, mobileApp, null);
        createTask("Create wireframes for mobile", "Design mobile app screens", TaskStatus.TODO,
                TaskPriority.MEDIUM, admin, jane, mobileApp, null);
        createTask("Setup CI/CD pipeline", "Configure Jenkins pipeline", TaskStatus.IN_PROGRESS,
                TaskPriority.URGENT, admin, john, websiteRedesign, null);

        Task documentation = createTask("Update documentation", "Update README and API docs", TaskStatus.TODO,
                TaskPriority.LOW, manager, jane, websiteRedesign, null);
        documentation.setDueDate(LocalDate.now().plusDays(7));
        taskRepository.save(documentation);

        Team engineering = new Team();
        engineering.setName("Engineering");
        engineering.setDescription("Engineering team");
        engineering.setOwner(manager);
        engineering.addMember(manager, MemberRole.OWNER);
        engineering.addMember(john, MemberRole.MEMBER);
        teamRepository.save(engineering);

        Team design = new Team();
        design.setName("Design");
        design.setDescription("Design team");
        design.setOwner(jane);
        design.addMember(jane, MemberRole.OWNER);
        teamRepository.save(design);

        log.info("[DataSeeder] Seed completed. Demo accounts: admin@taskflow.com/admin123, "
                + "manager@taskflow.com/manager123, john@taskflow.com/john123, jane@taskflow.com/jane123");
    }

    private User createUser(String name, String email, String password, Role role) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setActive(true);
        user.setAvatar("");
        return userRepository.save(user);
    }

    private Project createProject(String name, String description, User owner, ProjectStatus status,
                                  List<User> members) {
        Project project = new Project();
        project.setName(name);
        project.setDescription(description);
        project.setOwner(owner);
        project.setStatus(status);
        for (User member : members) {
            project.addMember(member, member.getId().equals(owner.getId()) ? MemberRole.OWNER : MemberRole.MEMBER);
        }
        return projectRepository.save(project);
    }

    private Task createTask(String title, String description, TaskStatus status, TaskPriority priority,
                            User createdBy, User assignedTo, Project project, LocalDateTime completedAt) {
        Task task = new Task();
        task.setTitle(title);
        task.setDescription(description);
        task.setStatus(status);
        task.setPriority(priority);
        task.setCategory("");
        task.setCreatedBy(createdBy);
        task.setAssignedTo(assignedTo);
        task.setProject(project);
        task.setCompletedAt(completedAt);
        return taskRepository.save(task);
    }
}
