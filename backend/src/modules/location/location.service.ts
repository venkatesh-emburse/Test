import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { Swipe } from '../../database/entities/swipe.entity';
import { Match } from '../../database/entities/match.entity';
import {
  GetNearbyUsersQueryDto,
  GetUsersInBoundsQueryDto,
  NearbyUserDto,
  MapConfigDto,
} from './dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Swipe)
    private swipeRepository: Repository<Swipe>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
  ) {}

  // ==================== NEARBY USERS ====================

  async getNearbyUsers(
    userId: string,
    query: GetNearbyUsersQueryDto,
  ): Promise<NearbyUserDto[]> {
    const {
      latitude,
      longitude,
      radiusKm = 0.3,
      limit = 20,
      verifiedOnly = false,
      activeWithinMinutes = 60,
    } = query;

    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Get users who have swiped or matched (to exclude)
    const swipedUserIds = await this.getSwipedUserIds(userId);
    const matchedUserIds = await this.getMatchedUserIds(userId);
    const blockedUserIds = await this.getBlockedUserIds(userId);

    const excludeIds = [
      userId,
      ...swipedUserIds,
      ...matchedUserIds,
      ...blockedUserIds,
    ];

    // Update current user's last active timestamp
    await this.userRepository.update(userId, { lastActiveAt: new Date() });

    // PostGIS query for nearby users with distance
    const radiusMeters = radiusKm * 1000;
    const activeSince = new Date(Date.now() - activeWithinMinutes * 60 * 1000);

    // Build the query
    let queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .addSelect(
        `ST_Distance("user"."location"::geography, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography) / 1000`,
        'distance_km',
      )
      .addSelect('ST_Y("user"."location"::geometry)', 'user_lat')
      .addSelect('ST_X("user"."location"::geometry)', 'user_lng')
      .where('"user"."location" IS NOT NULL')
      .andWhere(
        `ST_DWithin("user"."location"::geography, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${radiusMeters})`,
      )
      .andWhere('"user"."is_invisible" = :isInvisible', { isInvisible: false })
      .andWhere('"user"."last_active_at" >= :activeSince', { activeSince })
      .orderBy('distance_km', 'ASC')
      .take(limit);

    if (verifiedOnly) {
      queryBuilder = queryBuilder.andWhere('"user"."is_verified" = :verified', {
        verified: true,
      });
    }

    // Exclude already interacted users
    if (excludeIds.length > 0) {
      queryBuilder = queryBuilder.andWhere(
        '"user"."id" NOT IN (:...excludeIds)',
        {
          excludeIds: excludeIds,
        },
      );
    }

    const usersWithDistance = await queryBuilder.getRawAndEntities();

    return usersWithDistance.entities.map((user, index) => {
      const rawResult = usersWithDistance.raw[index];
      const distanceKm = parseFloat(rawResult?.distance_km) || 0;
      const userLat = parseFloat(rawResult?.user_lat) || latitude;
      const userLng = parseFloat(rawResult?.user_lng) || longitude;

      return this.mapToNearbyUserDto(
        user,
        distanceKm,
        userLat,
        userLng,
        latitude,
        longitude,
        radiusKm,
      );
    });
  }

  // ==================== USERS IN MAP BOUNDS ====================

  async getUsersInBounds(
    userId: string,
    query: GetUsersInBoundsQueryDto,
  ): Promise<NearbyUserDto[]> {
    const { north, south, east, west, limit = 30 } = query;

    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Update current user's last active timestamp
    await this.userRepository.update(userId, { lastActiveAt: new Date() });

    // Get exclusions
    const swipedUserIds = await this.getSwipedUserIds(userId);
    const matchedUserIds = await this.getMatchedUserIds(userId);
    const blockedUserIds = await this.getBlockedUserIds(userId);
    const excludeIds = new Set([
      userId,
      ...swipedUserIds,
      ...matchedUserIds,
      ...blockedUserIds,
    ]);

    // Calculate center of bounds for distance
    const centerLat = (north + south) / 2;
    const centerLng = (east + west) / 2;

    let queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .addSelect(
        `ST_Distance(
          user.location::geography,
          ST_SetSRID(ST_MakePoint(:centerLng, :centerLat), 4326)::geography
        ) / 1000`,
        'distance_km',
      )
      .addSelect('ST_Y(user.location::geometry)', 'user_lat')
      .addSelect('ST_X(user.location::geometry)', 'user_lng')
      .where('user.location IS NOT NULL')
      .andWhere(
        `ST_Within(
          user.location,
          ST_MakeEnvelope(:west, :south, :east, :north, 4326)
        )`,
      )
      .andWhere('user.isInvisible = :isInvisible', { isInvisible: false })
      .setParameters({
        north,
        south,
        east,
        west,
        centerLat,
        centerLng,
      })
      .orderBy('user.safetyScore', 'DESC')
      .take(limit);

    if (excludeIds.size > 0) {
      queryBuilder = queryBuilder.andWhere('user.id NOT IN (:...excludeIds)', {
        excludeIds: Array.from(excludeIds),
      });
    }

    const usersWithDistance = await queryBuilder.getRawAndEntities();

    return usersWithDistance.entities.map((user, index) => {
      const rawResult = usersWithDistance.raw[index];
      const distanceKm = parseFloat(rawResult.distance_km) || 0;
      const userLat = parseFloat(rawResult?.user_lat) || centerLat;
      const userLng = parseFloat(rawResult?.user_lng) || centerLng;

      return this.mapToNearbyUserDto(
        user,
        distanceKm,
        userLat,
        userLng,
        centerLat,
        centerLng,
        0.3,
      );
    });
  }

  // ==================== MAP CONFIG ====================

  getMapConfig(): MapConfigDto {
    // Using OpenStreetMap tiles (free, open source)
    return {
      tileServerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      defaultZoom: 13,
      minZoom: 10,
      maxZoom: 18,
    };
  }

  // Alternative map styles
  getMapStyles() {
    return {
      standard: {
        name: 'Standard',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
      },
      satellite: {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri',
      },
      dark: {
        name: 'Dark',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© CartoDB',
      },
      light: {
        name: 'Light',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '© CartoDB',
      },
    };
  }

  // ==================== HELPER METHODS ====================

  private async getSwipedUserIds(userId: string): Promise<string[]> {
    const swipes = await this.swipeRepository.find({
      where: { swiperId: userId },
      select: ['swipedId'],
    });
    return swipes.map((s) => s.swipedId);
  }

  private async getMatchedUserIds(userId: string): Promise<string[]> {
    const matches = await this.matchRepository.find({
      where: [{ user1Id: userId }, { user2Id: userId }],
    });

    return matches.map((m) => (m.user1Id === userId ? m.user2Id : m.user1Id));
  }

  private async getBlockedUserIds(userId: string): Promise<string[]> {
    // For MVP, using reports with 'BLOCKED' description
    const blocks = await this.userRepository.query(
      `SELECT reported_id FROM reports WHERE reporter_id = $1 AND description = 'BLOCKED'`,
      [userId],
    );
    return blocks.map((b: any) => b.reported_id);
  }

  private mapToNearbyUserDto(
    user: User,
    distanceKm: number,
    userLat: number,
    userLng: number,
    viewerLat: number,
    viewerLng: number,
    maxDistanceKm: number,
  ): NearbyUserDto {
    // Add random offset to location for privacy (up to ~60m)
    const latOffset = (Math.random() - 0.5) * 0.0011; // ~60m
    const lngOffset = (Math.random() - 0.5) * 0.0011;

    let approxLat = userLat + latOffset;
    let approxLng = userLng + lngOffset;

    // Ensure approximate marker stays within max distance from viewer
    const distanceMeters = this.haversineMeters(
      viewerLat,
      viewerLng,
      approxLat,
      approxLng,
    );
    const maxMeters = maxDistanceKm * 1000;
    if (distanceMeters > maxMeters) {
      const scale = (maxMeters * 0.98) / distanceMeters; // keep slightly inside
      approxLat = viewerLat + (approxLat - viewerLat) * scale;
      approxLng = viewerLng + (approxLng - viewerLng) * scale;
    }

    // Calculate age
    let age = 0;
    if (user.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(user.dateOfBirth);
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    return {
      id: user.id,
      name: user.name,
      age: age,
      photos: user.profile?.photos,
      gender: user.gender,
      intent: user.intent,
      safetyScore: Number(user.safetyScore),
      isVerified: user.isVerified,
      distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
      approximateLocation: {
        latitude: approxLat,
        longitude: approxLng,
      },
      bio: user.profile?.bio,
      interests: user.profile?.interests,
      lastActiveAt: user.lastActiveAt,
    };
  }

  private haversineMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
