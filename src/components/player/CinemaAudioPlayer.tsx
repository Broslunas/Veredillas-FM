import React from 'react';
import { NetflixPlayer, type NetflixPlayerProps } from './NetflixPlayer';

export interface CinemaAudioPlayerProps {
  audioUrl?: string;
  videoUrl?: string;
  title: string;
  author?: string;
  cover?: string;
  image?: string;
  slug: string;
  season?: number;
  episode?: number;
  initialProgress?: number;
  episodesList?: any[];
  sections?: any[];
  transcription?: any[];
  [key: string]: any;
}

export const CinemaAudioPlayer: React.FC<CinemaAudioPlayerProps> = (props) => {
  return (
    <NetflixPlayer
      slug={props.slug}
      title={props.title}
      author={props.author}
      season={props.season}
      episode={props.episode}
      image={props.cover || props.image}
      videoUrl={props.videoUrl}
      audioUrl={props.audioUrl}
      sections={props.sections}
      transcription={props.transcription}
      initialProgress={props.initialProgress || 0}
      episodesList={props.episodesList || []}
    />
  );
};

export default CinemaAudioPlayer;
