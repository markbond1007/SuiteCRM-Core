<?php

namespace App\Tests\unit\core\legacy\Statistics;

use App\Legacy\ModuleNameMapperHandler;
use App\Tests\_mock\Mock\core\legacy\Statistics\SubPanelEventsLastDateMock;
use App\Tests\UnitTester;
use Codeception\Test\Unit;
use Exception;

/**
 * Class SubPanelEventsLastDateTest
 * @package App\Tests
 */
class SubPanelEventsLastDateTest extends Unit
{
    /**
     * @var UnitTester
     */
    protected $tester;

    /**
     * @var SubPanelEventsLastDateMock
     */
    private $handler;

    /**
     * @throws Exception
     */
    protected function _before(): void
    {
        $projectDir = $this->tester->getProjectDir();
        $legacyDir = $this->tester->getLegacyDir();
        $legacySessionName = $this->tester->getLegacySessionName();
        $defaultSessionName = $this->tester->getDefaultSessionName();

        $legacyScope = $this->tester->getLegacyScope();

        $moduleNameMapper = new ModuleNameMapperHandler(
            $projectDir,
            $legacyDir,
            $legacySessionName,
            $defaultSessionName,
            $legacyScope
        );


        $this->handler = new SubPanelEventsLastDateMock(
            $projectDir,
            $legacyDir,
            $legacySessionName,
            $defaultSessionName,
            $legacyScope,
            $moduleNameMapper
        );
    }

    /**
     * Test Unsupported context module
     * @throws Exception
     */
    public function testUnsupportedContextModule(): void
    {
        $this->handler->reset();

        $result = $this->handler->getData([
                                              'context' => [
                                              ]
                                          ]);

        static::assertNotNull($result);
        static::assertNotNull($result->getData());
        static::assertNotNull($result->getMetadata());
        static::assertIsArray($result->getData());
        static::assertIsArray($result->getMetadata());
        static::assertEquals('events', $result->getId());
        static::assertArrayHasKey('type', $result->getMetadata());
        static::assertEquals('single-value-statistic', $result->getMetadata()['type']);
        static::assertArrayHasKey('dataType', $result->getMetadata());
        static::assertEquals('varchar', $result->getMetadata()['dataType']);
        static::assertArrayHasKey('value', $result->getData());
        static::assertEquals('-', $result->getData()['value']);
    }

    /**
     * Test Get Last Date
     * @throws Exception
     */
    public function testGetLastDate(): void
    {
        $this->handler->reset();

        $rows = [
            [
                'contacts_date_end' => '2019-12-12',
            ],
        ];
        $this->handler->setMockQueryResult($rows);

        $result = $this->handler->getData([
                                              'context' => [
                                                  'module' => 'contacts',
                                                  'id' => '12345',
                                              ]
                                          ]);

        static::assertNotNull($result);
        static::assertNotNull($result->getData());
        static::assertNotNull($result->getMetadata());
        static::assertIsArray($result->getData());
        static::assertIsArray($result->getMetadata());
        static::assertArrayHasKey('value', $result->getData());
        static::assertEquals('2019-12-12', $result->getData()['value']);
        static::assertEquals('events', $result->getId());
        static::assertArrayHasKey('type', $result->getMetadata());
        static::assertEquals('single-value-statistic', $result->getMetadata()['type']);
        static::assertArrayHasKey('dataType', $result->getMetadata());
        static::assertEquals('date', $result->getMetadata()['dataType']);

    }
}
