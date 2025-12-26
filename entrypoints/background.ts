
export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  browser.action.onClicked.addListener(() => {
    // Generate the URL for your dashboard entrypoint
    // WXT organizes HTML files in the output directory based on their folder name
    const dashboardUrl = browser.runtime.getURL('/dashboard.html');

    // Open the dashboard in a new tab
    browser.tabs.create({
      url: dashboardUrl,
      active: true // Focus the tab immediately
    });
  });
});
