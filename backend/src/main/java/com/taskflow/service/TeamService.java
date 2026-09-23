package com.taskflow.service;

import com.taskflow.dto.request.TeamRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.Team;
import com.taskflow.entity.TeamMember;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.ActivityEntityType;
import com.taskflow.entity.enums.MemberRole;
import com.taskflow.entity.enums.Role;
import com.taskflow.exception.ForbiddenException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.TeamRepository;
import com.taskflow.util.Pagination;
import com.taskflow.util.PaginationUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final ActivityService activityService;

    public TeamService(TeamRepository teamRepository, ActivityService activityService) {
        this.teamRepository = teamRepository;
        this.activityService = activityService;
    }

    @Transactional
    public Team createTeam(TeamRequests.CreateTeamRequest request, User current, String ip, String userAgent) {
        Team team = new Team();
        team.setName(request.name().trim());
        team.setDescription(request.description() == null ? "" : request.description());
        team.setOwner(current);
        team.addMember(current, MemberRole.OWNER);
        teamRepository.save(team);

        activityService.logActivity(current, "TEAM_CREATED", ActivityEntityType.Team, team.getId(),
                "Team created: \"" + team.getName() + "\"", null, ip, userAgent);
        return team;
    }

    @Transactional(readOnly = true)
    public ServiceResults.PageResult<Team> getTeams(PaginationUtils.PageRequest page, User current) {
        PageRequest pageRequest = PageRequest.of(page.page() - 1, page.limit(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Team> result = current.getRole() == Role.USER
                ? teamRepository.findByMemberUserId(current.getId(), pageRequest)
                : teamRepository.findAll(pageRequest);
        return new ServiceResults.PageResult<>(result.getContent(),
                Pagination.of(page.page(), page.limit(), result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public Team getTeam(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found.", "TEAM_NOT_FOUND"));
    }

    @Transactional
    public Team updateTeam(Long id, TeamRequests.UpdateTeamRequest request, User current) {
        Team team = getTeam(id);

        TeamMember member = findMember(team, current.getId());
        if (member == null || !canManage(member)) {
            throw new ForbiddenException("You do not have permission to update this team.", "NOT_AUTHORIZED");
        }

        if (request.name() != null) {
            team.setName(request.name().trim());
        }
        if (request.description() != null) {
            team.setDescription(request.description());
        }
        return teamRepository.save(team);
    }

    @Transactional
    public void deleteTeam(Long id, User current, String ip, String userAgent) {
        Team team = getTeam(id);
        if (!team.getOwner().getId().equals(current.getId())) {
            throw new ForbiddenException("Only the team owner can delete it.", "NOT_AUTHORIZED");
        }
        teamRepository.delete(team);

        activityService.logActivity(current, "TEAM_DELETED", ActivityEntityType.Team, id,
                "Team deleted", null, ip, userAgent);
    }

    private TeamMember findMember(Team team, Long userId) {
        if (userId == null) {
            return null;
        }
        return team.getMembers().stream()
                .filter(member -> member.getUser() != null && userId.equals(member.getUser().getId()))
                .findFirst()
                .orElse(null);
    }

    private boolean canManage(TeamMember member) {
        return member.getRole() == MemberRole.OWNER || member.getRole() == MemberRole.MANAGER;
    }
}
