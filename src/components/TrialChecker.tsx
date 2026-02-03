import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Button,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { DismissRegular, WarningRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 99999,
  },
  dialog: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('40px'),
    maxWidth: '500px',
    boxShadow: tokens.shadow64,
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '20px',
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
  message: {
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '30px',
    color: tokens.colorNeutralForeground1,
  },
  banner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});

interface TrialCheckerProps {
  children: React.ReactNode;
}

export const TrialChecker: React.FC<TrialCheckerProps> = ({ children }) => {
  const styles = useStyles();
  const [isChecking, setIsChecking] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [trialInfo, setTrialInfo] = useState<{ daysRemaining: number; message: string } | null>(null);

  useEffect(() => {
    checkTrial();
    // Verifica a cada hora
    const interval = setInterval(checkTrial, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkTrial = async () => {
    try {
      // Verifica status do trial
      await invoke('check_trial_status');
      
      // Pega informações do trial
      const [daysRemaining, message] = await invoke<[number, string]>('get_trial_info');
      setTrialInfo({ daysRemaining, message });
      
      setIsExpired(false);
      setIsChecking(false);
    } catch (error) {
      setErrorMessage(String(error));
      setIsExpired(true);
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className={styles.container}>
        <div className={styles.dialog}>
          <Spinner size="large" label="Verificando licença..." />
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className={styles.container}>
        <div className={styles.dialog}>
          <WarningRegular style={{ fontSize: '64px', color: tokens.colorPaletteDarkOrangeForeground1, marginBottom: '20px' }} />
          <div className={styles.title}>Período de Avaliação Expirado</div>
          <div className={styles.message} style={{ whiteSpace: 'pre-line' }}>
            {errorMessage}
          </div>
          <Button
            appearance="primary"
            size="large"
            onClick={() => window.close()}
          >
            Fechar Aplicação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {trialInfo && trialInfo.daysRemaining <= 7 && trialInfo.daysRemaining > 0 && (
        <MessageBar intent="warning" className={styles.banner}>
          <MessageBarBody>
            <MessageBarTitle>
              ⏰ Período de Avaliação: {trialInfo.daysRemaining} dia(s) restante(s)
            </MessageBarTitle>
            {trialInfo.message}
          </MessageBarBody>
        </MessageBar>
      )}
      <div style={{ marginTop: trialInfo && trialInfo.daysRemaining <= 7 && trialInfo.daysRemaining > 0 ? '60px' : '0' }}>
        {children}
      </div>
    </>
  );
};
