package com.example.board.member;

import com.example.board.common.BusinessException;
import com.example.board.common.ErrorCode;
import com.example.board.file.FileStorage;
import com.example.board.file.FileValidator;
import com.example.board.member.dto.MemberResponse;
import com.example.board.member.dto.PasswordUpdateRequest;
import com.example.board.member.dto.ProfileUpdateRequest;
import lombok.RequiredArgsConstructor;
import lombok.val;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberService {
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorage fileStorage;
    private final FileValidator fileValidator;

    @Transactional
    public MemberResponse updateProfile(String email, ProfileUpdateRequest request) {
        val member = current(email);
        if (request.nickname().contains(" ")) throw new BusinessException(ErrorCode.INVALID_INPUT, "띄어쓰기를 없애주세요");
        if (memberRepository.existsByNickname(request.nickname()) && !member.getNickname().equals(request.nickname())) throw new BusinessException(ErrorCode.DUPLICATE_NICKNAME);
        fileValidator.optionalImage(request.profileImage());
        val image = request.profileImage() == null || request.profileImage().isEmpty() ? member.getProfileImageUrl() : fileStorage.store(request.profileImage(), "profiles").url();
        member.updateProfile(request.nickname(), image);
        return MemberResponse.from(member);
    }

    @Transactional
    public void updatePassword(String email, PasswordUpdateRequest request) {
        if (!request.password().equals(request.passwordConfirm())) throw new BusinessException(ErrorCode.INVALID_INPUT, "비밀번호 확인과 다릅니다.");
        current(email).changePassword(passwordEncoder.encode(request.password()));
    }

    private Member current(String email) {
        return memberRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }
}
