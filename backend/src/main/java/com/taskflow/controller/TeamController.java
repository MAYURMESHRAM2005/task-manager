package com.taskflow.controller;

import com.taskflow.dto.request.TeamRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.Team;
import com.taskflow.entity.User;
import com.taskflow.service.TeamService;
import com.taskflow.util.ApiResponse;
import com.taskflow.util.PaginationUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Team>>> getTeams(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @AuthenticationPrincipal User currentUser) {
        ServiceResults.PageResult<Team> result = teamService.getTeams(
                PaginationUtils.resolve(page, limit), currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Teams retrieved successfully", result.data(),
                result.pagination()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createTeam(
            @Valid @RequestBody TeamRequests.CreateTeamRequest request,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Team team = teamService.createTeam(request, currentUser, http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Team created successfully", Map.of("team", team)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeam(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Team retrieved successfully", Map.of("team", teamService.getTeam(id))));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateTeam(
            @PathVariable Long id, @Valid @RequestBody TeamRequests.UpdateTeamRequest request,
            @AuthenticationPrincipal User currentUser) {
        Team team = teamService.updateTeam(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Team updated successfully", Map.of("team", team)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTeam(@PathVariable Long id,
                                                        @AuthenticationPrincipal User currentUser,
                                                        HttpServletRequest http) {
        teamService.deleteTeam(id, currentUser, http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Team deleted successfully", null));
    }
}
