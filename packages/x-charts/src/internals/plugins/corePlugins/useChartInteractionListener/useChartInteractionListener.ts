'use client';
import * as React from 'react';
import {
  GestureManager,
  MoveGesture,
  PanGesture,
  PressGesture,
  TapGesture,
  type Gesture,
} from '@mui/x-internal-gestures/core';
import { type ChartPlugin } from '../../models';
import {
  type UseChartInteractionListenerSignature,
  type AddInteractionListener,
  type UpdateZoomInteractionListeners,
} from './useChartInteractionListener.types';

const preventDefault = (event: Event) => event.preventDefault();

type GestureManagerTyped = GestureManager<
  string,
  | PanGesture<'pan'>
  | MoveGesture<'move'>
  | TapGesture<'tap'>
  | PressGesture<'quickPress'>
  | PanGesture<'brush'>
>;

export const useChartInteractionListener: ChartPlugin<UseChartInteractionListenerSignature> = ({
  instance,
}) => {
  const { chartsLayerContainerRef } = instance;
  const gestureManagerRef = React.useRef<GestureManagerTyped | null>(null);

  React.useEffect(() => {
    const svg = chartsLayerContainerRef.current;

    if (!gestureManagerRef.current) {
      gestureManagerRef.current = new GestureManager({
        gestures: [
          new PanGesture({
            name: 'pan',
            threshold: 0,
            maxPointers: 1,
          }),
          new MoveGesture({
            name: 'move',
            preventIf: ['pan', 'zoomPinch', 'zoomPan'],
          }),
          new TapGesture({
            name: 'tap',
            preventIf: ['pan', 'zoomPinch', 'zoomPan'],
          }),
          new PressGesture({
            name: 'quickPress',
            duration: 50,
          }),
          new PanGesture({
            name: 'brush',
            threshold: 0,
            maxPointers: 1,
          }),
        ],
      });
    }

    // Assign gesture manager after initialization
    const gestureManager = gestureManagerRef.current;

    if (!svg || !gestureManager) {
      return undefined;
    }

    gestureManager.registerElement(['pan', 'move', 'tap', 'quickPress', 'brush'], svg);

    return () => {
      // Cleanup gesture manager
      gestureManager.unregisterAllGestures(svg);
    };
  }, [chartsLayerContainerRef, gestureManagerRef]);

  const addInteractionListener: AddInteractionListener = React.useCallback(
    (interaction, callback, options) => {
      // Forcefully cast the chartsLayerContainerRef to any, it is annoying to fix the types.
      const svg = chartsLayerContainerRef.current as any;

      svg?.addEventListener(interaction, callback, options);

      return {
        cleanup: () => svg?.removeEventListener(interaction, callback, options),
      };
    },
    [chartsLayerContainerRef],
  );

  const updateZoomInteractionListeners: UpdateZoomInteractionListeners = React.useCallback(
    (interaction, options) => {
      const svg = chartsLayerContainerRef.current;
      const gestureManager = gestureManagerRef.current;
      if (!gestureManager || !svg) {
        return;
      }

      (gestureManager as any).setGestureOptions(interaction, svg, options ?? {});
    },
    [chartsLayerContainerRef, gestureManagerRef],
  );

  const registerZoomGestures = React.useCallback(
    (gestures: Gesture<string>[], gestureNames: string[]) => {
      const gestureManager = gestureManagerRef.current;
      const svg = chartsLayerContainerRef.current;
      if (!gestureManager || !svg) {
        return;
      }
      gestures.forEach((gesture) => gestureManager.registerGestureTemplate(gesture));
      (gestureManager as any).registerElement(gestureNames, svg);
    },
    [],
  );

  React.useEffect(() => {
    const svg = chartsLayerContainerRef.current;

    // Disable gesture on safari
    // https://use-gesture.netlify.app/docs/gestures/#about-the-pinch-gesture
    svg?.addEventListener('gesturestart', preventDefault);
    svg?.addEventListener('gesturechange', preventDefault);
    svg?.addEventListener('gestureend', preventDefault);

    return () => {
      svg?.removeEventListener('gesturestart', preventDefault);
      svg?.removeEventListener('gesturechange', preventDefault);
      svg?.removeEventListener('gestureend', preventDefault);
    };
  }, [chartsLayerContainerRef]);

  return {
    instance: {
      addInteractionListener,
      updateZoomInteractionListeners,
      registerZoomGestures,
    },
  };
};

useChartInteractionListener.params = {};

useChartInteractionListener.getInitialState = () => {
  return {};
};
