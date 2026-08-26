export type VoiceProposal = {
  id: string;
  title: string;
  category: 'Work' | 'Life' | 'Health' | 'Money' | 'Growth' | 'Quick';
  when: string;
  durationLabel?: string;
  who: string;
  steps: string[];
  unresolved?: boolean;
};

export const voiceDumpFixture = {
  transcript: [
    'I need to call the dentist tomorrow,',
    'me and Sarah need to figure out the trip,',
    'I need to sort the spare room this weekend,',
    'I want to get back into running,',
    "I've just been really stressed lately,",
    "and with the garage and boxes I need to… actually I don't know…",
  ],
  contextOnly: "I've just been really stressed lately.",
  clarificationPrompt: 'When you mentioned the garage and the boxes, what did you want to get done?',
  clarificationTranscript: 'Oh yeah — I just need to move all the boxes from the garage into storage.',
  proposals: [
    {
      id: 'trip',
      title: 'Plan our trip',
      category: 'Growth',
      when: 'This week',
      who: 'Together · With Sarah',
      steps: ['Choose possible dates', 'Shortlist places', 'Compare travel options'],
    },
    {
      id: 'dentist',
      title: 'Call the dentist',
      category: 'Life',
      when: 'Tomorrow',
      who: 'Just me',
      steps: ['Call and book an appointment'],
    },
    {
      id: 'spare-room',
      title: 'Sort the spare room',
      category: 'Life',
      when: 'This weekend',
      who: 'Just me',
      steps: ['Clear the floor', 'Group what stays', 'Donate what can go'],
    },
    {
      id: 'running',
      title: 'Get back into running',
      category: 'Health',
      when: 'Ongoing',
      who: 'Just me',
      steps: ['Put out running clothes', 'Take one easy twenty-minute run'],
    },
    {
      id: 'garage',
      title: 'Garage + boxes',
      category: 'Life',
      when: 'Not sure yet',
      who: 'Just me',
      steps: [],
      unresolved: true,
    },
  ] satisfies VoiceProposal[],
};
