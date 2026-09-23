package com.taskflow.service;

import com.taskflow.dto.request.UserRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.User;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.UserRepository;
import com.taskflow.util.Pagination;
import com.taskflow.util.PaginationUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Active users (used to populate assignment dropdowns). */
    @Transactional(readOnly = true)
    public ServiceResults.PageResult<User> getUsers(String search, PaginationUtils.PageRequest page) {
        PageRequest pageRequest = PageRequest.of(page.page() - 1, page.limit(), Sort.by("name").ascending());
        Page<User> result = (search == null || search.isBlank())
                ? userRepository.findByActiveTrue(pageRequest)
                : userRepository.searchActive(search.trim(), pageRequest);
        return new ServiceResults.PageResult<>(result.getContent(),
                Pagination.of(page.page(), page.limit(), result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found.", "USER_NOT_FOUND"));
    }

    @Transactional
    public User updateProfile(Long userId, UserRequests.UpdateProfileRequest request) {
        User user = getUser(userId);

        boolean updated = false;
        if (request.name() != null) {
            user.setName(request.name().trim());
            updated = true;
        }
        if (request.avatar() != null) {
            user.setAvatar(request.avatar());
            updated = true;
        }
        if (!updated) {
            throw new BadRequestException("No valid fields to update.", "NO_UPDATES");
        }
        return userRepository.save(user);
    }
}
