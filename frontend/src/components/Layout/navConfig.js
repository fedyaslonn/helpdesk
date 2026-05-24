/**
 * Конфигурация бокового меню по ролям.
 */
export const getNavSections = (role) => {
  const isAdmin = role === 'admin';
  const isEngineer = role === 'engineer';
  const isClient = role === 'client';

  const sections = [
    {
      title: 'Заявки',
      items: [
        {
          to: '/helpdesk/tickets',
          label: isClient ? 'Мои заявки' : isEngineer ? 'Доступные заявки' : 'Все заявки',
          end: false,
        },
        { to: '/helpdesk/tickets/create', label: 'Создать заявку', end: true },
      ],
    },
    {
      title: 'База знаний',
      items: [
        { to: '/helpdesk/kb-articles', label: 'Все статьи', end: true },
        ...(isAdmin || isEngineer
          ? [{ to: '/helpdesk/kb-articles/create', label: 'Добавить статью', end: true }]
          : []),
      ],
    },
  ];

  if (isAdmin || isEngineer) {
    sections.push({
      title: 'Смены',
      items: [
        {
          to: '/helpdesk/shift-management',
          label: isAdmin ? 'Управление сменами' : 'Мой график',
          end: true,
        },
      ],
    });
  }

  if (isAdmin) {
    sections.push({
      title: 'Пользователи',
      items: [
        { to: '/users', label: 'Все пользователи', end: true },
        { to: '/engineers', label: 'Инженеры', end: true },
      ],
    });
    sections.push({
      title: 'Администрирование',
      items: [
        { to: '/helpdesk/categories', label: 'Категории', end: true },
        { to: '/helpdesk/priorities', label: 'Приоритеты', end: true },
        { to: '/helpdesk/classification-rules', label: 'Правила классификации', end: true },
        { to: '/helpdesk/api/metrics', label: 'Системные метрики', end: true },
      ],
    });
  }

  sections.push({
    title: 'Аккаунт',
    items: [
      { to: '/helpdesk/notifications', label: 'Уведомления', end: true },
    ],
  });

  return sections;
};
