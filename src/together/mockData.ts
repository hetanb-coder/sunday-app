import type { TogetherFixture } from './models';
import { colors } from '../theme';

export const currentMember = {
  id: 'me',
  name: 'You',
  initials: 'Y',
  color: colors.coralPrimary,
};

export const connectedTogetherFixture: TogetherFixture = {
  currentMember,
  connections: [
    {
      id: 'connection-sarah',
      userId: 'user-sarah',
      displayName: 'Sarah',
      avatar: {
        initials: 'S',
        color: '#9E8BE8',
      },
      relationshipType: 'partner',
      status: 'connected',
      createdAt: '2026-01-01T12:00:00.000Z',
    },
  ],
  sharedGoals: [
    {
      id: 'trip',
      title: 'Plan our trip',
      category: 'life',
      collaborationMode: 'shared',
      memberIds: ['me', 'user-sarah'],
      status: 'active',
      microtasks: [
        ['dates', 'Choose our dates', true, 'me'],
        ['budget', 'Set a comfortable budget', true, 'user-sarah'],
        ['stay', 'Shortlist places to stay', true, 'user-sarah'],
        ['route', 'Sketch the route', true, 'me'],
        ['book', 'Book the first stay', true, 'user-sarah'],
        ['food', 'Save a few food spots', false, null],
        ['pack', 'Make a shared packing list', false, null],
        ['confirm', 'Confirm the final plan', false, null],
      ].map(([id, title, completed, assignedTo]) => ({
        id: String(id),
        title: String(title),
        completed: Boolean(completed),
        assignedTo: assignedTo ? String(assignedTo) : null,
      })),
    },
    {
      id: 'spare-room',
      title: 'Sort the spare room',
      category: 'life',
      collaborationMode: 'shared',
      memberIds: ['me', 'user-sarah'],
      status: 'active',
      microtasks: [
        { id: 'sort', title: 'Sort the shelves', completed: true, assignedTo: 'me' },
        { id: 'donate', title: 'Bag donations', completed: true, assignedTo: 'user-sarah' },
        { id: 'desk', title: 'Clear the desk', completed: true, assignedTo: 'user-sarah' },
        { id: 'finish', title: 'Put the keepers away', completed: false, assignedTo: null },
      ],
    },
  ],
  // Explicit demo-only remote-user goals. Locally accepted connections do not
  // receive fabricated histories; a backend can replace this fixture later.
  supportedGoals: [
    {
      id: 'running',
      title: 'Build a running habit',
      category: 'health',
      collaborationMode: 'supported',
      ownerId: 'me',
      supporterIds: ['user-sarah'],
      completedSteps: 2,
      totalSteps: 4,
    },
    {
      id: 'driving-test',
      title: 'Prepare for my driving test',
      category: 'growth',
      collaborationMode: 'supported',
      ownerId: 'user-sarah',
      supporterIds: ['me'],
      completedSteps: 2,
      totalSteps: 4,
    },
  ],
  recentWin: 'Finished the first pass of the spare room together',
};

export const emptyTogetherFixture: TogetherFixture = {
  currentMember,
  connections: [],
  sharedGoals: [],
  supportedGoals: [],
  recentWin: '',
};

// Switch to `emptyTogetherFixture` for the no-connections development fixture.
export const activeTogetherFixture = connectedTogetherFixture;
