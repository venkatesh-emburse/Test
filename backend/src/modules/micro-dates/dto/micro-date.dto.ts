import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Game configuration (defined first)
export class MicroDateGameConfig {
  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  instructions: string;

  @ApiPropertyOptional()
  prompts?: string[];

  @ApiPropertyOptional()
  options?: string[][];
}

// Get game for a match
export class GetMicroDateGameResponseDto {
  @ApiProperty({ example: 'two_truths_lie' })
  gameType: string;

  @ApiProperty({
    description: 'Game configuration and prompts',
    type: () => MicroDateGameConfig,
  })
  gameConfig: MicroDateGameConfig;

  @ApiProperty({ description: 'Has current user answered' })
  hasAnswered: boolean;

  @ApiProperty({ description: 'Has other user answered' })
  otherUserAnswered: boolean;

  @ApiProperty({ description: 'Is game completed (both answered)' })
  isCompleted: boolean;

  @ApiPropertyOptional({ description: 'Answers (only if both have answered)' })
  answers?: {
    myAnswer: any;
    theirAnswer: any;
  };
}

// Submit answer DTO
export class SubmitMicroDateAnswerDto {
  @ApiProperty({ description: 'Match ID' })
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @ApiProperty({ description: 'Answer data (format depends on game type)' })
  @IsObject()
  answer: Record<string, any>;
}

// Response DTOs
export class SubmitAnswerResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ description: 'Is game now complete' })
  gameCompleted: boolean;

  @ApiProperty({ description: 'Is chat now unlocked' })
  chatUnlocked: boolean;

  @ApiPropertyOptional({ description: 'Both answers if game completed' })
  answers?: {
    myAnswer: any;
    theirAnswer: any;
  };
}

// Game definitions (as plain objects, not classes)
export const MICRO_DATE_GAMES: Record<
  string,
  {
    title: string;
    description: string;
    instructions: string;
    prompts?: string[];
    options?: string[][];
  }
> = {
  two_truths_lie: {
    title: '2 Truths and 1 Lie',
    description: 'Share 2 true facts and 1 lie about yourself',
    instructions:
      'Write down 2 truths and 1 lie about yourself. The other person will try to guess which one is the lie!',
    prompts: [
      'Statement 1',
      'Statement 2',
      'Statement 3',
      'Which one is the lie? (1, 2, or 3)',
    ],
  },
  would_you_rather: {
    title: 'Would You Rather',
    description: 'Answer 3 would you rather questions',
    instructions:
      'Choose your preference for each question. See how compatible you are!',
    options: [
      ['Travel to the past', 'Travel to the future'],
      ['Have the ability to fly', 'Have the ability to read minds'],
      ['Live in a big city forever', 'Live in the countryside forever'],
    ],
  },
  perfect_sunday: {
    title: 'My Perfect Sunday',
    description: 'Describe your ideal Sunday',
    instructions:
      'Share what your perfect Sunday looks like. Let your match know your vibe!',
    prompts: [
      'Morning activity',
      'Afternoon plans',
      'Evening mood',
      'One thing that makes it perfect',
    ],
  },
  travel_dreams: {
    title: 'Dream Destinations',
    description: 'Share your travel bucket list',
    instructions: 'Tell us about your dream travel destinations!',
    prompts: [
      'Top dream destination',
      'Type of vacation you prefer',
      'Best trip memory',
      'Travel partner must-have quality',
    ],
  },
  food_wars: {
    title: 'Food Wars',
    description: 'Settle the great food debates',
    instructions: 'Pick your side in these classic food debates!',
    options: [
      ['Pizza', 'Burger'],
      ['Sweet breakfast', 'Savory breakfast'],
      ['Cook at home', 'Order in'],
      ['Coffee', 'Tea'],
    ],
  },
};

export type MicroDateGameType = keyof typeof MICRO_DATE_GAMES;
