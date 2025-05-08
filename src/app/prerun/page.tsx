export default function PrerunPage() {
    // Placeholder URL - to be replaced with the actual deployed Shiny app URL
    const shinyAppUrl = "https://youraccount.shinyapps.io/your-app-name/?initial_tab=prerun";

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Prerun Scenarios</h1>
            <p className="mb-4">
                Displaying Prerun Scenarios from the JHEEM Interactive application.
            </p>
            <div style={{ width: '100%', height: '800px', border: '1px solid #ccc' }}>
                <iframe
                    src={shinyAppUrl}
                    title="Prerun Scenarios - JHEEM Interactive"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
            </div>
        </div>
    );
}