import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
    SendPhoneOtpDto,
    SendEmailOtpDto,
    VerifyPhoneOtpDto,
    VerifyEmailOtpDto,
    SetIntentDto,
    CreateProfileDto,
    RefreshTokenDto,
    OtpSentResponseDto,
    AuthTokensResponseDto,
} from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../../database/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // ==================== OTP ENDPOINTS ====================

    @Post('otp/phone/send')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send OTP to phone number' })
    @ApiResponse({ status: 200, description: 'OTP sent successfully', type: OtpSentResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid phone number or rate limit exceeded' })
    async sendPhoneOtp(@Body() dto: SendPhoneOtpDto) {
        return this.authService.sendPhoneOtp(dto);
    }

    @Post('otp/email/send')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send OTP to email address' })
    @ApiResponse({ status: 200, description: 'OTP sent successfully', type: OtpSentResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid email or rate limit exceeded' })
    async sendEmailOtp(@Body() dto: SendEmailOtpDto) {
        return this.authService.sendEmailOtp(dto);
    }

    @Post('otp/phone/verify')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify phone OTP and authenticate' })
    @ApiResponse({ status: 200, description: 'Authentication successful', type: AuthTokensResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
    async verifyPhoneOtp(@Body() dto: VerifyPhoneOtpDto) {
        return this.authService.verifyPhoneOtp(dto);
    }

    @Post('otp/email/verify')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify email OTP and authenticate' })
    @ApiResponse({ status: 200, description: 'Authentication successful', type: AuthTokensResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
    async verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
        return this.authService.verifyEmailOtp(dto);
    }

    @Post('firebase/verify')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify Firebase ID token and authenticate' })
    @ApiResponse({ status: 200, description: 'Authentication successful', type: AuthTokensResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid Firebase token' })
    async verifyFirebaseToken(@Body() dto: { idToken: string }) {
        return this.authService.authenticateWithFirebase(dto.idToken);
    }

    // ==================== TOKEN ENDPOINTS ====================

    @Post('refresh')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiResponse({ status: 200, description: 'Tokens refreshed successfully', type: AuthTokensResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refreshTokens(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshTokens(dto);
    }

    @Post('logout')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user and revoke all tokens' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async logout(@CurrentUser('id') userId: string) {
        return this.authService.logout(userId);
    }

    // ==================== ONBOARDING ENDPOINTS ====================

    @Post('onboarding/intent')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Set or update user intent (can only change once every 30 days)' })
    @ApiResponse({ status: 200, description: 'Intent set successfully' })
    @ApiResponse({ status: 400, description: 'Intent change not allowed yet' })
    async setIntent(
        @CurrentUser('id') userId: string,
        @Body() dto: SetIntentDto,
    ) {
        return this.authService.setIntent(userId, dto);
    }

    @Post('onboarding/profile')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Create or update user profile' })
    @ApiResponse({ status: 200, description: 'Profile created/updated successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async createProfile(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateProfileDto,
    ) {
        return this.authService.createProfile(userId, dto);
    }

    // ==================== USER ENDPOINTS ====================

    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current authenticated user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getMe(@CurrentUser('id') userId: string) {
        return this.authService.getMe(userId);
    }

    // ==================== DEV ENDPOINTS ====================

    @Get('dev/otp/:identifier')
    @Public()
    @ApiOperation({ summary: '[DEV ONLY] Get OTP for testing (only works in development)' })
    @ApiResponse({ status: 200, description: 'OTP retrieved successfully' })
    @ApiResponse({ status: 400, description: 'No OTP found or production mode' })
    async getDevOtp(@Param('identifier') identifier: string) {
        return this.authService.getDevOtp(identifier);
    }
}
