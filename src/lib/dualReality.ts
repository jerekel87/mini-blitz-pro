import type { BootStatus } from '../types';

export type LaneStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

export type RealityAlignment =
  | 'aligned'
  | 'instant-ahead'
  | 'truth-ahead'
  | 'diverged'
  | 'both-error'
  | 'waiting';

export interface DualRealityState {
  alignment: RealityAlignment;
  label: string;
  detail: string;
  instantStatus: LaneStatus;
  truthStatus: LaneStatus;
}

export function computeDualReality(params: {
  instantError: string | null;
  instantReady: boolean;
  instantUnsupported: string[];
  truthUrl: string | null;
  truthBootStatus: BootStatus;
  truthError: string | null;
}): DualRealityState {
  const {
    instantError,
    instantReady,
    instantUnsupported,
    truthUrl,
    truthBootStatus,
    truthError,
  } = params;

  const truthLoading = ['booting', 'mounting', 'installing', 'starting'].includes(truthBootStatus);
  const truthReady = truthBootStatus === 'ready' && !!truthUrl;
  const truthErrorState = truthBootStatus === 'error' || !!truthError;

  let instantStatus: LaneStatus = 'idle';
  if (instantError) instantStatus = 'error';
  else if (instantReady) instantStatus = instantUnsupported.length > 0 ? 'unsupported' : 'ready';
  else instantStatus = 'loading';

  let truthStatus: LaneStatus = 'idle';
  if (truthErrorState) truthStatus = 'error';
  else if (truthReady) truthStatus = 'ready';
  else if (truthLoading) truthStatus = 'loading';

  if (!instantReady && truthLoading) {
    return {
      alignment: 'waiting',
      instantStatus,
      truthStatus,
      label: 'Warming up',
      detail: 'Truth lane is installing dependencies…',
    };
  }

  if (instantReady && !truthReady && truthLoading) {
    return {
      alignment: 'instant-ahead',
      instantStatus,
      truthStatus,
      label: 'Instant ahead',
      detail: 'Approximate preview is live while Vite boots in WebContainer.',
    };
  }

  if (instantError && truthReady) {
    return {
      alignment: 'diverged',
      instantStatus,
      truthStatus,
      label: 'Diverged',
      detail: instantError,
    };
  }

  if (instantReady && truthReady && instantUnsupported.length > 0) {
    return {
      alignment: 'diverged',
      instantStatus,
      truthStatus,
      label: 'Partial match',
      detail: `Truth lane has full fidelity. Instant skips: ${instantUnsupported.join('; ')}`,
    };
  }

  if (instantReady && truthReady) {
    return {
      alignment: 'aligned',
      instantStatus,
      truthStatus,
      label: 'Aligned',
      detail: 'Both lanes are serving your latest edits.',
    };
  }

  if (instantError && truthErrorState) {
    return {
      alignment: 'both-error',
      instantStatus,
      truthStatus,
      label: 'Both lanes blocked',
      detail: truthError ?? instantError ?? 'Check terminal for details.',
    };
  }

  if (truthReady && !instantReady && !instantError) {
    return {
      alignment: 'truth-ahead',
      instantStatus,
      truthStatus,
      label: 'Truth only',
      detail: 'Instant lane could not bundle this project shape yet.',
    };
  }

  return {
    alignment: 'waiting',
    instantStatus,
    truthStatus,
    label: 'Syncing',
    detail: 'Waiting for previews to update…',
  };
}